// routes/vendorroutes.js - Vendor Quote Routes
const express = require('express');
const router = express.Router();
const { body, query, param, validationResult } = require('express-validator');
const vendorQuoteController = require('../controllers/vendorQuoteController');

// VALIDATION MIDDLEWARE
const validateQuoteSubmission = [
  body('itemId')
    .trim()
    .notEmpty().withMessage('Item ID is required')
    .isLength({ min: 5 }).withMessage('Invalid item ID'),
  body('vendorName')
    .trim()
    .notEmpty().withMessage('Vendor name is required')
    .isLength({ min: 2, max: 100 }).withMessage('Vendor name must be 2-100 characters')
    .matches(/^[a-zA-Z0-9\s\-._&()]*$/).withMessage('Vendor name contains invalid characters'),
  body('vendorEmail')
    .trim()
    .toLowerCase()
    .isEmail().withMessage('Invalid email address'),
  body('vendorPhone')
    .optional()
    .trim()
    .matches(/^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,9}$/)
    .withMessage('Invalid phone number'),
  body('quotedPrice')
    .notEmpty().withMessage('Quoted price is required')
    .isFloat({ min: 0 }).withMessage('Price must be a positive number'),
  body('remarks')
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage('Remarks cannot exceed 500 characters'),
  body('termsAccepted')
    .optional()
    .isBoolean().withMessage('Terms acceptance must be boolean')
];

const validateStatusUpdate = [
  param('quoteId')
    .isMongoId().withMessage('Invalid quote ID'),
  body('status')
    .notEmpty().withMessage('Status is required')
    .isIn(['pending', 'reviewed', 'accepted', 'rejected']).withMessage('Invalid status'),
  body('adminNotes')
    .optional()
    .trim()
    .isLength({ max: 1000 }).withMessage('Admin notes cannot exceed 1000 characters'),
  body('rejectionReason')
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage('Rejection reason cannot exceed 500 characters')
];

// ==================== PUBLIC ROUTES ====================

// @route   POST /api/vendor/submit-quote
// @desc    Submit a new vendor quote
// @access  Public
router.post('/submit-quote', validateQuoteSubmission, vendorQuoteController.submitQuote);

// @route   GET /api/vendor/quotes/:itemId
// @desc    Get all quotes for a specific item
// @access  Public (Vendor Portal)
router.get('/quotes/:itemId', 
  param('itemId').trim().notEmpty().withMessage('Item ID is required'),
  vendorQuoteController.getQuotesForItem
);

// @route   GET /api/vendor/product/:itemId
// @desc    Get product info for vendor portal
// @access  Public
router.get('/product/:itemId', async (req, res) => {
  try {
    const { itemId } = req.params;
    
    if (!itemId) {
      return res.status(400).json({
        success: false,
        message: 'Item ID is required'
      });
    }
    
    // Try to fetch from internal API
    const axios = require('axios');
    try {
      const response = await axios.get(
        `${process.env.INTERNAL_API_URL || 'http://localhost:5000'}/api/admin/basket-items`
      );
      
      if (response.data.success && response.data.items) {
        const product = response.data.items.find(item => item._id === itemId);
        
        if (product) {
          return res.json({
            success: true,
            product: {
              _id: product._id,
              productName: product.productName,
              productImage: product.productImage,
              variant: product.variant || { name: 'Standard' },
              quantity: product.quantity,
              memberNote: product.memberNote || '',
              memberMessage: product.memberMessage || '',
              createdAt: product.createdAt
            }
          });
        }
      }
    } catch (axiosError) {
      console.error('Axios error:', axiosError.message);
    }
    
    // If not found, return error
    return res.status(404).json({
      success: false,
      message: 'Product not found'
    });
    
  } catch (error) {
    console.error('Error fetching product:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching product',
      error: error.message
    });
  }
});

// Webhook to sync quotes to external system (if needed)
router.post('/webhook/sync-to-external', async (req, res) => {
  try {
    const { itemId, quoteId } = req.body;
    
    const quote = await VendorQuote.findById(quoteId);
    if (!quote) {
      return res.status(404).json({ success: false, message: 'Quote not found' });
    }
    
    // Push quote to external API if it supports vendorQuotes field
    await axios.patch(
      `https://other-userpanel.basavamart.com/api/basket-items/${itemId}/add-vendor-quote`,
      {
        vendorQuote: {
          vendorName: quote.vendorName,
          vendorEmail: quote.vendorEmail,
          vendorPhone: quote.vendorPhone,
          quotedPrice: quote.quotedPrice,
          remarks: quote.remarks,
          submittedAt: quote.submittedAt
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.EXTERNAL_API_TOKEN}`
        }
      }
    );
    
    res.json({ success: true, message: 'Synced to external system' });
  } catch (error) {
    console.error('Sync error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Admin: Get all quotes across all products
router.get('/admin/all-quotes', async (req, res) => {
  try {
    const { page = 1, limit = 50, status, sortBy = 'submittedAt' } = req.query;
    
    const query = {};
    if (status) query.status = status;
    
    const quotes = await VendorQuote.find(query)
      .sort({ [sortBy]: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .lean();
    
    const total = await VendorQuote.countDocuments(query);
    
    res.json({
      success: true,
      quotes,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Admin: Update quote status
router.put('/admin/quote/:quoteId', async (req, res) => {
  try {
    const { status, adminNote } = req.body;
    
    const quote = await VendorQuote.findByIdAndUpdate(
      req.params.quoteId,
      { status, adminNote, reviewedAt: new Date() },
      { new: true }
    );
    
    if (!quote) {
      return res.status(404).json({ success: false, message: 'Quote not found' });
    }
    
    res.json({ success: true, quote });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Helper function to notify admin
async function notifyAdminNewQuote(itemId, quote) {
  try {
    // Send email notification
    await sendEmail({
      to: process.env.ADMIN_EMAIL,
      subject: `New Vendor Quote for Item ${itemId}`,
      html: `
        <h2>New Vendor Quote Submitted</h2>
        <p><strong>Product ID:</strong> ${itemId}</p>
        <p><strong>Vendor:</strong> ${quote.vendorName}</p>
        <p><strong>Email:</strong> ${quote.vendorEmail}</p>
        <p><strong>Phone:</strong> ${quote.vendorPhone}</p>
        <p><strong>Price:</strong> ₹${quote.quotedPrice}</p>
        <p><strong>Remarks:</strong> ${quote.remarks || 'None'}</p>
        <p><strong>Time:</strong> ${quote.submittedAt.toLocaleString()}</p>
        <br>
        <a href="${process.env.ADMIN_PANEL_URL}/vendor-quotes">View All Quotes</a>
      `
    });
    
    // Optional: Send Slack/Teams notification
    if (process.env.SLACK_WEBHOOK_URL) {
      await axios.post(process.env.SLACK_WEBHOOK_URL, {
        text: `📋 New vendor quote submitted!\n*Product:* ${itemId}\n*Vendor:* ${quote.vendorName}\n*Price:* ₹${quote.quotedPrice}\n*Remarks:* ${quote.remarks || 'None'}`
      });
    }
  } catch (error) {
    console.error('Notification error:', error.message);
  }
}

// Helper function to send email
async function sendEmail({ to, subject, html }) {
  // Implement your email sending logic here
  // Using nodemailer, sendgrid, etc.
}

module.exports = router;