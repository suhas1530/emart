const mongoose = require('mongoose');
const VendorQuote = require('../models/VendorQuote');
const VendorQuoteRequest = require('../models/VendorQuoteRequest');
const BasketItem = require('../models/BasketItem');
const { validationResult } = require('express-validator');

// @desc    Submit a new vendor quote (single item - legacy flow)
// @route   POST /api/vendor/submit-quote
// @access  Public
exports.submitQuote = async (req, res) => {
  try {
    console.log('📨 Received quote submission:', JSON.stringify(req.body, null, 2));
    // Temporary debug log for body (requested)
    console.log(req.body);

    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('❌ Validation errors:', errors.array());
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { itemId, vendorName, vendorEmail, vendorPhone, quotedPrice, remarks, productName: productNameReq, productImage: productImageReq } = req.body;

    console.log('📋 Processing:', { itemId, vendorName, vendorEmail, vendorPhone, quotedPrice, remarks });

    // Additional validation
    if (!itemId || !vendorName || !vendorEmail || quotedPrice === undefined) {
      console.log('❌ Missing required fields');
      return res.status(400).json({
        success: false,
        message: 'Missing required fields',
        received: { itemId, vendorName, vendorEmail, quotedPrice }
      });
    }

    const numPrice = parseFloat(quotedPrice);
    if (isNaN(numPrice) || numPrice < 0) {
      console.log('❌ Invalid price:', quotedPrice);
      return res.status(400).json({
        success: false,
        message: 'Price must be a valid positive number'
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
      console.log('⚠️ Rate limit exceeded for IP:', ipAddress);
      return res.status(429).json({
        success: false,
        message: 'Rate limit exceeded. Maximum 5 quotes per hour allowed.',
        retryAfter: 3600
      });
    }

    // Attempt to get product details from BasketItem, fall back to req.body
    let productNameFinal = productNameReq || null;
    let productImageFinal = productImageReq || null;

    try {
      if (itemId) {
        const basketItem = await BasketItem.findById(itemId).lean();
        if (basketItem) {
          productNameFinal = basketItem.productName || productNameFinal;
          productImageFinal = basketItem.productImage || productImageFinal;
        }
      }
    } catch (lookupErr) {
      // If lookup fails, just log and continue with fallback values from req.body
      console.warn('⚠️ BasketItem lookup failed, using provided values if any:', lookupErr.message);
    }

    // Create new quote
    const quote = new VendorQuote({
      itemId,
      productName: productNameFinal ? String(productNameFinal).trim().substring(0, 200) : null,
      productImage: productImageFinal ? String(productImageFinal).trim() : null,
      vendorName: vendorName.trim().substring(0, 100),
      vendorEmail: vendorEmail.toLowerCase().trim(),
      vendorPhone: vendorPhone ? vendorPhone.trim() : null,
      quotedPrice: numPrice,
      remarks: remarks ? remarks.trim().substring(0, 500) : null,
      ipAddress,
      status: 'pending',
      submittedAt: new Date()
    });

    // Save to database
    await quote.save();
    console.log('✅ Quote saved successfully:', quote._id);

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
    console.error('❌ Error submitting quote:', error.message);
    console.error('Stack:', error.stack);
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

    const quotesRaw = await VendorQuote.find(filters)
      .sort({ submittedAt: -1 })
      .skip(skip)
      .limit(pageSize)
      .lean();

    // Enrich with recovered vendor names
    const quotes = await Promise.all(quotesRaw.map(async (q) => {
      let recoveredName = q.vendorName;
      if (!recoveredName && q.vendorEmail) {
        const prev = await VendorQuote.findOne({
          vendorEmail: q.vendorEmail,
          vendorName: { $ne: null, $ne: '' }
        }).sort({ submittedAt: -1 }).select('vendorName').lean();
        if (prev) recoveredName = prev.vendorName;
      }
      return { ...q, vendorName: recoveredName };
    }));

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

// ==================== MULTI-ITEM QUOTE REQUESTS ====================

// @desc    Create a new multi-item vendor quote request (admin)
// @route   POST /api/admin/vendor-quote-requests
// @access  Private (Admin)
exports.createMultiItemQuoteRequest = async (req, res) => {
  try {
    const { orderId, vendorId, vendorName, vendorEmail, items, tokenExpiryMinutes = 10080 } = req.body; // default 7 days

    if (!orderId || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'orderId and at least one item are required'
      });
    }

    // Basic item validation (productId, requestedQty > 0, no duplicates)
    const seen = new Set();
    for (const item of items) {
      if (!item.productId) {
        return res.status(400).json({
          success: false,
          message: 'Each item must include a productId'
        });
      }
      if (!item.requestedQty || item.requestedQty <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Each item must have requestedQty > 0'
        });
      }
      const key = `${item.productId}::${item.variantId || ''}`;
      if (seen.has(key)) {
        return res.status(400).json({
          success: false,
          message: 'Duplicate product/variant combinations are not allowed'
        });
      }
      seen.add(key);
    }

    // Generate secure random token
    const { randomUUID } = require('crypto');
    const token = randomUUID();

    const expiresAt = new Date(Date.now() + tokenExpiryMinutes * 60 * 1000);

    const normalizedItems = items.map(it => ({
      productId: String(it.productId).trim(),
      variantId: it.variantId ? String(it.variantId).trim() : null,
      productName: it.productName ? String(it.productName).trim().substring(0, 200) : null,
      variantName: it.variantName ? String(it.variantName).trim().substring(0, 100) : null,
      image: it.image ? String(it.image).trim() : null,
      requestedQty: Number(it.requestedQty),
      vendorPrice: null,
      vendorRemark: null
    }));

    const quoteRequest = await VendorQuoteRequest.create({
      orderId: String(orderId).trim(),
      vendorId: vendorId ? String(vendorId).trim() : null,
      vendorName: vendorName ? String(vendorName).trim().substring(0, 100) : null,
      vendorEmail: vendorEmail ? String(vendorEmail).toLowerCase().trim() : null,
      items: normalizedItems,
      status: 'pending',
      token,
      tokenExpiresAt: expiresAt
    });

    console.log('✅ VendorQuoteRequest saved to DB:', quoteRequest._id, '| token:', token, '| expires:', expiresAt);

    return res.status(201).json({
      success: true,
      message: 'Vendor quote request created',
      request: quoteRequest,
      token
    });
  } catch (error) {
    console.error('❌ Error creating multi-item quote request:', error);
    return res.status(500).json({
      success: false,
      message: 'Error creating quote request',
      error: error.message
    });
  }
};

// @desc    Get quote request details for vendor by token
// @route   GET /api/vendor/quote-request/:token
// @access  Public
exports.getMultiItemQuoteByToken = async (req, res) => {
  try {
    const { token } = req.params;

    const requestDoc = await VendorQuoteRequest.findOne({ token }).lean();

    if (!requestDoc) {
      return res.status(404).json({
        success: false,
        message: 'Quote request not found'
      });
    }

    const isExpired = !requestDoc.tokenExpiresAt || requestDoc.tokenExpiresAt <= new Date();

    if (isExpired) {
      return res.status(410).json({
        success: false,
        message: 'Quote request has expired',
        status: 'expired'
      });
    }

    return res.status(200).json({
      success: true,
      request: {
        _id: requestDoc._id,
        orderId: requestDoc.orderId,
        vendorId: requestDoc.vendorId,
        vendorName: requestDoc.vendorName,
        vendorEmail: requestDoc.vendorEmail,
        items: requestDoc.items,
        status: requestDoc.status,
        tokenExpiresAt: requestDoc.tokenExpiresAt,
        createdAt: requestDoc.createdAt
      }
    });
  } catch (error) {
    console.error('❌ Error fetching quote request by token:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching quote request',
      error: error.message
    });
  }
};

// @desc    Vendor submits prices for multi-item quote request
// @route   POST /api/vendor/quote-request/:token/submit
// @access  Public
exports.submitMultiItemQuote = async (req, res) => {
  try {
    const { token } = req.params;
    const { items, vendorName, vendorEmail, vendorPhone } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Items array is required'
      });
    }

    // Find the ORIGINAL template quote request by token
    const templateDoc = await VendorQuoteRequest.findOne({ token });

    if (!templateDoc) {
      return res.status(404).json({
        success: false,
        message: 'Quote request not found'
      });
    }

    // Check token expiry — but NOT submitted status, multiple vendors can use the same link
    if (templateDoc.tokenExpiresAt && templateDoc.tokenExpiresAt < new Date()) {
      return res.status(400).json({
        success: false,
        message: 'Token expired'
      });
    }

    // Map incoming prices by product/variant key
    const priceMap = new Map();
    for (const it of items) {
      if (!it.productId) {
        return res.status(400).json({
          success: false,
          message: 'Each submitted item must include a productId'
        });
      }
      if (it.vendorPrice === undefined || it.vendorPrice === null) {
        return res.status(400).json({
          success: false,
          message: 'Each submitted item must include vendorPrice'
        });
      }
      const priceNum = Number(it.vendorPrice);
      if (!Number.isFinite(priceNum) || priceNum <= 0) {
        return res.status(400).json({
          success: false,
          message: 'vendorPrice must be greater than 0'
        });
      }
      const key = `${it.productId}::${it.variantId || ''}`;
      priceMap.set(key, {
        price: priceNum,
        remark: it.vendorRemark ? String(it.vendorRemark).trim().substring(0, 500) : null
      });
    }

    // Build the items array with vendor prices merged in
    const submittedItems = templateDoc.items.map(existing => {
      const key = `${existing.productId}::${existing.variantId || ''}`;
      const submitted = priceMap.get(key);
      return {
        productId: existing.productId,
        variantId: existing.variantId || null,
        productName: existing.productName || null,
        variantName: existing.variantName || null,
        image: existing.image || null,
        requestedQty: existing.requestedQty,
        vendorPrice: submitted ? submitted.price : null,
        vendorRemark: submitted ? submitted.remark : null
      };
    });

    // Resolve vendor identity
    let resolvedVendorName = (vendorName && vendorName.trim())
      ? vendorName.trim().substring(0, 100)
      : (templateDoc.vendorName || null);

    const resolvedVendorEmail = (vendorEmail && vendorEmail.trim())
      ? vendorEmail.toLowerCase().trim()
      : (templateDoc.vendorEmail || null);

    // CRITICAL: Ensure we have an email. 
    // If both body and template are missing it, we cannot save the submission.
    if (!resolvedVendorEmail) {
      console.warn('⚠️ Rejected submission: Missing vendor email', { token, vendorName });
      return res.status(400).json({
        success: false,
        message: 'Vendor email is required for submission. Please provide your email in the form.'
      });
    }

    // CRITICAL: If still no name but we have an email, try to recover it from ALL history 
    // or use email prefix. This prevents "Unknown Vendor" for submitted quotes.
    if (!resolvedVendorName && resolvedVendorEmail) {
      console.log(`🔍 Attempting to recover name for email: ${resolvedVendorEmail}`);

      // Try VendorQuoteRequest (multi) history
      const matchMulti = await mongoose.model('VendorQuoteRequest').findOne({
        vendorEmail: resolvedVendorEmail,
        vendorName: { $nin: [null, '', /Unknown/i, /Awaiting/i] }
      }).sort({ createdAt: -1 }).select('vendorName').lean();

      if (matchMulti) {
        resolvedVendorName = matchMulti.vendorName;
        console.log(`✅ Recovered name from VendorQuoteRequest: ${resolvedVendorName}`);
      } else {
        // Try VendorQuote (single) history
        const matchSingle = await mongoose.model('VendorQuote').findOne({
          vendorEmail: resolvedVendorEmail,
          vendorName: { $nin: [null, '', /Unknown/i, /Awaiting/i] }
        }).sort({ createdAt: -1 }).select('vendorName').lean();

        if (matchSingle) {
          resolvedVendorName = matchSingle.vendorName;
          console.log(`✅ Recovered name from VendorQuote: ${resolvedVendorName}`);
        } else {
          // Fallback to email prefix (e.g. "suhashj543" from "suhashj543@gmail.com")
          resolvedVendorName = resolvedVendorEmail.split('@')[0];
          console.log(`ℹ️ No history found. Using email prefix as fallback: ${resolvedVendorName}`);
        }
      }
    }

    const resolvedVendorPhone = (vendorPhone && vendorPhone.trim())
      ? vendorPhone.trim()
      : (templateDoc.vendorPhone || null);

    // ✅ Create a NEW document for this vendor's submission
    const { randomUUID } = require('crypto');
    const newToken = randomUUID();

    const submittedDoc = await VendorQuoteRequest.create({
      orderId: templateDoc.orderId,
      vendorId: templateDoc.vendorId || null,
      vendorName: resolvedVendorName || 'Unknown Vendor', // Final fallback
      vendorEmail: resolvedVendorEmail,
      vendorPhone: resolvedVendorPhone,
      items: submittedItems,
      status: 'submitted',
      token: newToken,
      tokenExpiresAt: templateDoc.tokenExpiresAt,
      submittedAt: new Date()
    });

    console.log('✅ Vendor quote submission created:', {
      id: submittedDoc._id,
      name: submittedDoc.vendorName,
      email: submittedDoc.vendorEmail,
      items: submittedDoc.items.length
    });

    return res.status(200).json({
      success: true,
      message: 'Quote submitted successfully',
      request: submittedDoc
    });
  } catch (error) {
    console.error('❌ Error submitting multi-item quote:', error);
    return res.status(500).json({
      success: false,
      message: 'Error submitting quote',
      error: error.message
    });
  }
};

// @desc    Admin: list multi-item quote requests
// @route   GET /api/admin/vendor-quote-requests
// @access  Private (Admin)
exports.getAdminMultiItemQuotes = async (req, res) => {
  try {
    const { orderId, status, page = 1, limit = 20, includeTemplates } = req.query;

    const query = {};
    if (orderId) query.orderId = orderId;
    if (status && ['pending', 'submitted', 'approved', 'accepted', 'rejected'].includes(status)) {
      query.status = status;
    } else if (!includeTemplates) {
      // By default, exclude 'pending' template documents (they have no vendor info).
      // Only show documents that have been submitted by a vendor.
      query.status = { $ne: 'pending' };
    }

    const pageNum = parseInt(page, 10) || 1;
    const pageSize = Math.min(parseInt(limit, 10) || 20, 100);
    const skip = (pageNum - 1) * pageSize;

    const [requests, total] = await Promise.all([
      VendorQuoteRequest.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(pageSize)
        .lean(),
      VendorQuoteRequest.countDocuments(query)
    ]);

    // Compute totals and attempt to RECOVER missing vendor names from email history
    const enriched = await Promise.all(requests.map(async (r) => {
      let recoveredName = r.vendorName;

      // If name is missing but email exists, try to find the name from previous quotes
      if (!recoveredName && r.vendorEmail) {
        // Try VendorQuoteRequest first
        const previousRequest = await mongoose.model('VendorQuoteRequest')
          .findOne({ vendorEmail: r.vendorEmail, vendorName: { $nin: [null, ''] } })
          .sort({ createdAt: -1 })
          .select('vendorName')
          .lean();

        if (previousRequest) {
          recoveredName = previousRequest.vendorName;
        } else {
          // Try VendorQuote (single item)
          const previousQuote = await mongoose.model('VendorQuote')
            .findOne({ vendorEmail: r.vendorEmail, vendorName: { $nin: [null, ''] } })
            .sort({ createdAt: -1 })
            .select('vendorName')
            .lean();
          if (previousQuote) recoveredName = previousQuote.vendorName;
        }

        // Last-resort fallback: use email username as display name
        if (!recoveredName && r.vendorEmail) {
          recoveredName = r.vendorEmail.split('@')[0];
        }

        if (recoveredName && recoveredName !== r.vendorName) {
          console.log(`🔄 Recovered vendor name for ${r._id}: "${recoveredName}" (email: ${r.vendorEmail})`);
        }
      }

      const totalAmount = (r.items || [])
        .filter(it => typeof it.vendorPrice === 'number')
        .reduce((sum, it) => sum + it.vendorPrice * (it.requestedQty || 1), 0);

      return {
        ...r,
        vendorName: recoveredName,
        totalAmount
      };
    }));

    return res.status(200).json({
      success: true,
      requests: enriched,
      pagination: {
        page: pageNum,
        limit: pageSize,
        total,
        pages: Math.ceil(total / pageSize)
      }
    });
  } catch (error) {
    console.error('❌ Error fetching admin multi-item quotes:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching multi-item quotes',
      error: error.message
    });
  }
};

// @desc    Update vendor information on a quote (Admin only)
// @route   PATCH /api/vendor-quote-requests/:id
// @access  Private (Admin)
exports.updateVendorQuoteRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { vendorName, vendorEmail, vendorPhone } = req.body;

    // Try multi-item request first
    let doc = await VendorQuoteRequest.findById(id);

    // If not found, try single-item quote
    if (!doc) {
      doc = await VendorQuote.findById(id);
    }

    if (!doc) {
      return res.status(404).json({
        success: false,
        message: 'Quote document not found'
      });
    }

    if (vendorName !== undefined) doc.vendorName = vendorName ? vendorName.trim() : null;
    if (vendorEmail !== undefined) doc.vendorEmail = vendorEmail ? vendorEmail.trim().toLowerCase() : null;
    if (vendorPhone !== undefined) doc.vendorPhone = vendorPhone ? vendorPhone.trim() : null;

    await doc.save();

    return res.status(200).json({
      success: true,
      message: 'Vendor information updated successfully',
      data: doc
    });
  } catch (error) {
    console.error('Error updating vendor info:', error);
    return res.status(500).json({
      success: false,
      message: 'Error updating vendor information',
      error: error.message
    });
  }
};

