const VendorQuote = require('../models/VendorQuote');
const { validationResult } = require('express-validator');

// @desc    Submit a new vendor quote
// @route   POST /api/vendor/submit-quote
// @access  Public
exports.submitQuote = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        message: 'Validation failed',
        errors: errors.array() 
      });
    }

    const { itemId, vendorName, vendorEmail, vendorPhone, quotedPrice, remarks } = req.body;

    // Additional validation
    if (!itemId || !vendorName || !vendorEmail || quotedPrice === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }

    if (quotedPrice < 0) {
      return res.status(400).json({
        success: false,
        message: 'Price cannot be negative'
      });
    }

    // Get client IP for rate limiting
    const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';

    // Check rate limit: max 5 submissions per hour per IP
    const oneHourAgo = new Date(Date.now() - 3600000);
    const recentSubmissions = await VendorQuote.countDocuments({
      ipAddress,
      submittedAt: { $gte: oneHourAgo }
    });

    if (recentSubmissions >= 5) {
      return res.status(429).json({
        success: false,
        message: 'Rate limit exceeded. Maximum 5 quotes per hour allowed.',
        retryAfter: 3600
      });
    }

    // Create new quote
    const quote = new VendorQuote({
      itemId,
      vendorName: vendorName.trim().substring(0, 100),
      vendorEmail: vendorEmail.toLowerCase().trim(),
      vendorPhone: vendorPhone ? vendorPhone.trim() : null,
      quotedPrice: parseFloat(quotedPrice),
      remarks: remarks ? remarks.trim().substring(0, 500) : null,
      ipAddress,
      status: 'pending',
      submittedAt: new Date()
    });

    // Save to database
    await quote.save();

    // Fetch product name to store with quote (if available in future)
    // This is for record-keeping purposes

    return res.status(201).json({
      success: true,
      message: 'Quote submitted successfully',
      quote: {
        _id: quote._id,
        itemId: quote.itemId,
        vendorName: quote.vendorName,
        vendorEmail: quote.vendorEmail,
        quotedPrice: quote.quotedPrice,
        submittedAt: quote.submittedAt,
        status: quote.status
      }
    });

  } catch (error) {
    console.error('Error submitting quote:', error);
    return res.status(500).json({
      success: false,
      message: 'Error submitting quote',
      error: error.message
    });
  }
};

// @desc    Get all quotes for a specific item (Public - for vendor portal)
// @route   GET /api/vendor/quotes/:itemId
// @access  Public
exports.getQuotesForItem = async (req, res) => {
  try {
    const { itemId } = req.params;

    if (!itemId) {
      return res.status(400).json({
        success: false,
        message: 'Item ID is required'
      });
    }

    // Fetch all active quotes for the item, sorted by price
    const quotes = await VendorQuote.find({ 
      itemId, 
      status: { $ne: 'rejected' } 
    })
      .select('vendorName vendorEmail vendorPhone quotedPrice remarks submittedAt status')
      .sort({ quotedPrice: 1 })
      .lean();

    // Calculate statistics
    const stats = {
      total: quotes.length,
      lowestPrice: quotes.length > 0 ? quotes[0].quotedPrice : null,
      averagePrice: quotes.length > 0 
        ? (quotes.reduce((sum, q) => sum + q.quotedPrice, 0) / quotes.length).toFixed(2)
        : null
    };

    return res.status(200).json({
      success: true,
      quotes,
      stats,
      message: `Found ${quotes.length} quote(s) for item ${itemId}`
    });

  } catch (error) {
    console.error('Error fetching quotes:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching quotes',
      error: error.message
    });
  }
};

// @desc    Get all vendor quotes (Admin only)
// @route   GET /api/admin/vendor-quotes
// @access  Private (Admin)
exports.getAdminQuotes = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, itemId, vendorName, startDate, endDate } = req.query;

    // Build filter query
    const filters = {};

    if (status && ['pending', 'reviewed', 'accepted', 'rejected'].includes(status)) {
      filters.status = status;
    }

    if (itemId) {
      filters.itemId = itemId;
    }

    if (vendorName) {
      filters.vendorName = { $regex: vendorName, $options: 'i' }; // Case-insensitive search
    }

    // Date range filter
    if (startDate || endDate) {
      filters.submittedAt = {};
      if (startDate) {
        filters.submittedAt.$gte = new Date(startDate);
      }
      if (endDate) {
        filters.submittedAt.$lte = new Date(endDate);
      }
    }

    // Get total count
    const total = await VendorQuote.countDocuments(filters);

    // Fetch paginated results
    const pageNum = parseInt(page);
    const pageSize = Math.min(parseInt(limit), 100); // Max 100 items per page
    const skip = (pageNum - 1) * pageSize;

    const quotes = await VendorQuote.find(filters)
      .sort({ submittedAt: -1 })
      .skip(skip)
      .limit(pageSize)
      .lean();

    // Get statistics
    const stats = await VendorQuote.aggregate([
      { $match: filters },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          avgPrice: { $avg: '$quotedPrice' },
          minPrice: { $min: '$quotedPrice' },
          maxPrice: { $max: '$quotedPrice' }
        }
      }
    ]);

    return res.status(200).json({
      success: true,
      quotes,
      pagination: {
        page: pageNum,
        limit: pageSize,
        total,
        pages: Math.ceil(total / pageSize)
      },
      statistics: stats,
      message: `Retrieved ${quotes.length} quotes`
    });

  } catch (error) {
    console.error('Error fetching admin quotes:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching quotes',
      error: error.message
    });
  }
};

// @desc    Get a specific quote
// @route   GET /api/admin/vendor-quotes/:quoteId
// @access  Private (Admin)
exports.getQuoteById = async (req, res) => {
  try {
    const { quoteId } = req.params;

    const quote = await VendorQuote.findById(quoteId);

    if (!quote) {
      return res.status(404).json({
        success: false,
        message: 'Quote not found'
      });
    }

    return res.status(200).json({
      success: true,
      quote
    });

  } catch (error) {
    console.error('Error fetching quote:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching quote',
      error: error.message
    });
  }
};

// @desc    Update quote status (Admin only)
// @route   PATCH /api/admin/vendor-quotes/:quoteId/status
// @access  Private (Admin)
exports.updateQuoteStatus = async (req, res) => {
  try {
    const { quoteId } = req.params;
    const { status, adminNotes, rejectionReason } = req.body;

    // Validate status
    const validStatuses = ['pending', 'reviewed', 'accepted', 'rejected'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
      });
    }

    // Find quote
    const quote = await VendorQuote.findById(quoteId);

    if (!quote) {
      return res.status(404).json({
        success: false,
        message: 'Quote not found'
      });
    }

    // Update quote
    quote.status = status;
    quote.lastModifiedAt = new Date();
    quote.lastModifiedBy = req.user?.id || 'admin'; // If using auth middleware

    if (adminNotes) {
      quote.adminNotes = adminNotes.trim().substring(0, 1000);
    }

    if (status === 'rejected' && rejectionReason) {
      quote.rejectionReason = rejectionReason.trim().substring(0, 500);
    }

    await quote.save();

    // TODO: Send email notification to vendor about status change
    // sendVendorNotification(quote);

    return res.status(200).json({
      success: true,
      message: `Quote status updated to "${status}"`,
      quote: {
        _id: quote._id,
        status: quote.status,
        adminNotes: quote.adminNotes,
        lastModifiedAt: quote.lastModifiedAt
      }
    });

  } catch (error) {
    console.error('Error updating quote status:', error);
    return res.status(500).json({
      success: false,
      message: 'Error updating quote status',
      error: error.message
    });
  }
};

// @desc    Add admin notes to a quote
// @route   PATCH /api/admin/vendor-quotes/:quoteId/notes
// @access  Private (Admin)
exports.addAdminNotes = async (req, res) => {
  try {
    const { quoteId } = req.params;
    const { adminNotes } = req.body;

    if (!adminNotes || adminNotes.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Admin notes cannot be empty'
      });
    }

    const quote = await VendorQuote.findById(quoteId);

    if (!quote) {
      return res.status(404).json({
        success: false,
        message: 'Quote not found'
      });
    }

    quote.adminNotes = adminNotes.trim().substring(0, 1000);
    quote.lastModifiedAt = new Date();
    await quote.save();

    return res.status(200).json({
      success: true,
      message: 'Admin notes added successfully',
      quote: {
        _id: quote._id,
        adminNotes: quote.adminNotes
      }
    });

  } catch (error) {
    console.error('Error adding admin notes:', error);
    return res.status(500).json({
      success: false,
      message: 'Error adding admin notes',
      error: error.message
    });
  }
};

// @desc    Delete a quote (Admin only)
// @route   DELETE /api/admin/vendor-quotes/:quoteId
// @access  Private (Admin)
exports.deleteQuote = async (req, res) => {
  try {
    const { quoteId } = req.params;

    const quote = await VendorQuote.findByIdAndDelete(quoteId);

    if (!quote) {
      return res.status(404).json({
        success: false,
        message: 'Quote not found'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Quote deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting quote:', error);
    return res.status(500).json({
      success: false,
      message: 'Error deleting quote',
      error: error.message
    });
  }
};

// @desc    Get quotes statistics (Admin only)
// @route   GET /api/admin/vendor-quotes/stats/summary
// @access  Private (Admin)
exports.getQuotesStatistics = async (req, res) => {
  try {
    const { itemId, startDate, endDate } = req.query;

    // Build filter
    const filters = {};
    if (itemId) {
      filters.itemId = itemId;
    }

    if (startDate || endDate) {
      filters.submittedAt = {};
      if (startDate) {
        filters.submittedAt.$gte = new Date(startDate);
      }
      if (endDate) {
        filters.submittedAt.$lte = new Date(endDate);
      }
    }

    // Get overall statistics
    const totalQuotes = await VendorQuote.countDocuments(filters);

    const stats = await VendorQuote.aggregate([
      { $match: filters },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          avgPrice: { $avg: '$quotedPrice' },
          minPrice: { $min: '$quotedPrice' },
          maxPrice: { $max: '$quotedPrice' },
          pending: {
            $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
          },
          reviewed: {
            $sum: { $cond: [{ $eq: ['$status', 'reviewed'] }, 1, 0] }
          },
          accepted: {
            $sum: { $cond: [{ $eq: ['$status', 'accepted'] }, 1, 0] }
          },
          rejected: {
            $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] }
          }
        }
      }
    ]);

    // Top vendors by quote count
    const topVendors = await VendorQuote.aggregate([
      { $match: filters },
      {
        $group: {
          _id: '$vendorName',
          quoteCount: { $sum: 1 },
          avgPrice: { $avg: '$quotedPrice' },
          minPrice: { $min: '$quotedPrice' }
        }
      },
      { $sort: { quoteCount: -1 } },
      { $limit: 10 }
    ]);

    return res.status(200).json({
      success: true,
      statistics: {
        overall: stats.length > 0 ? stats[0] : null,
        topVendors
      }
    });

  } catch (error) {
    console.error('Error fetching statistics:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching statistics',
      error: error.message
    });
  }
};

// @desc    Export quotes to CSV (Admin only)
// @route   GET /api/admin/vendor-quotes/export/csv
// @access  Private (Admin)
exports.exportQuotesToCSV = async (req, res) => {
  try {
    const { itemId, status } = req.query;

    const filters = {};
    if (itemId) filters.itemId = itemId;
    if (status) filters.status = status;

    const quotes = await VendorQuote.find(filters).lean();

    if (quotes.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No quotes found to export'
      });
    }

    // Create CSV header
    const csvHeader = 'Item ID,Vendor Name,Vendor Email,Vendor Phone,Quoted Price,Price with GST,Remarks,Status,Submitted Date,Admin Notes\n';

    // Create CSV rows
    const csvRows = quotes.map(quote => {
      const priceWithGST = (quote.quotedPrice * 1.18).toFixed(2);
      const date = new Date(quote.submittedAt).toLocaleDateString();
      
      return [
        quote.itemId,
        `"${quote.vendorName}"`,
        quote.vendorEmail,
        quote.vendorPhone || 'N/A',
        quote.quotedPrice.toFixed(2),
        priceWithGST,
        `"${(quote.remarks || '').replace(/"/g, '""')}"`,
        quote.status,
        date,
        `"${(quote.adminNotes || '').replace(/"/g, '""')}"`
      ].join(',');
    });

    const csv = csvHeader + csvRows.join('\n');

    // Send file
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="vendor-quotes-${Date.now()}.csv"`);
    res.send(csv);

  } catch (error) {
    console.error('Error exporting quotes:', error);
    return res.status(500).json({
      success: false,
      message: 'Error exporting quotes',
      error: error.message
    });
  }
};

// @desc    Bulk update quote status (Admin only)
// @route   POST /api/admin/vendor-quotes/bulk/status
// @access  Private (Admin)
exports.bulkUpdateStatus = async (req, res) => {
  try {
    const { quoteIds, status } = req.body;

    if (!Array.isArray(quoteIds) || quoteIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Quote IDs array is required'
      });
    }

    if (!['pending', 'reviewed', 'accepted', 'rejected'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status'
      });
    }

    const result = await VendorQuote.updateMany(
      { _id: { $in: quoteIds } },
      {
        $set: {
          status,
          lastModifiedAt: new Date(),
          lastModifiedBy: req.user?.id || 'admin'
        }
      }
    );

    return res.status(200).json({
      success: true,
      message: `Updated ${result.modifiedCount} quote(s) to "${status}"`,
      modified: result.modifiedCount,
      matched: result.matchedCount
    });

  } catch (error) {
    console.error('Error in bulk update:', error);
    return res.status(500).json({
      success: false,
      message: 'Error updating quotes',
      error: error.message
    });
  }
};
