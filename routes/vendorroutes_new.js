// routes/vendorroutes.js - Vendor Quote Routes with all endpoints
const express = require('express');
const router = express.Router();
const { body, query, param } = require('express-validator');
const vendorQuoteController = require('../controllers/vendorQuoteController');
const axios = require('axios');

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
    .isLength({ max: 500 }).withMessage('Remarks cannot exceed 500 characters')
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

// Admin authentication middleware placeholder
const requireAdmin = (req, res, next) => {
  // TODO: Implement JWT verification
  // For now, we'll assume requests from admin routes are authenticated
  next();
};

// ==================== PUBLIC ROUTES ====================

// POST /api/vendor/submit-quote - Submit a new vendor quote
router.post(
  '/submit-quote',
  validateQuoteSubmission,
  vendorQuoteController.submitQuote
);

// GET /api/vendor/quotes/:itemId - Get all quotes for a specific item
router.get(
  '/quotes/:itemId',
  param('itemId').trim().notEmpty().withMessage('Item ID is required'),
  vendorQuoteController.getQuotesForItem
);

// GET /api/vendor/product/:itemId - Get product info for vendor portal
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

// ==================== ADMIN ROUTES ====================

// GET /api/admin/vendor-quotes - Get all vendor quotes (with filtering & pagination)
router.get(
  '/admin/vendor-quotes',
  (req, res, next) => {
    console.log('📍 GET /admin/vendor-quotes route hit');
    next();
  },
  requireAdmin,
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  query('status').optional().isIn(['pending', 'reviewed', 'accepted', 'rejected']),
  query('itemId').optional().trim(),
  query('vendorName').optional().trim(),
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601(),
  vendorQuoteController.getAdminQuotes
);

// GET /api/admin/vendor-quotes/:quoteId - Get a specific quote
router.get(
  '/admin/vendor-quotes/:quoteId',
  requireAdmin,
  param('quoteId').isMongoId().withMessage('Invalid quote ID'),
  vendorQuoteController.getQuoteById
);

// PATCH /api/admin/vendor-quotes/:quoteId/status - Update quote status
router.patch(
  '/admin/vendor-quotes/:quoteId/status',
  requireAdmin,
  validateStatusUpdate,
  vendorQuoteController.updateQuoteStatus
);

// PATCH /api/admin/vendor-quotes/:quoteId/notes - Add admin notes
router.patch(
  '/admin/vendor-quotes/:quoteId/notes',
  requireAdmin,
  param('quoteId').isMongoId().withMessage('Invalid quote ID'),
  body('adminNotes')
    .trim()
    .notEmpty().withMessage('Admin notes cannot be empty')
    .isLength({ max: 1000 }).withMessage('Admin notes cannot exceed 1000 characters'),
  vendorQuoteController.addAdminNotes
);

// DELETE /api/admin/vendor-quotes/:quoteId - Delete a quote
router.delete(
  '/admin/vendor-quotes/:quoteId',
  requireAdmin,
  param('quoteId').isMongoId().withMessage('Invalid quote ID'),
  vendorQuoteController.deleteQuote
);

// GET /api/admin/vendor-quotes/stats/summary - Get statistics
router.get(
  '/admin/vendor-quotes/stats/summary',
  requireAdmin,
  query('itemId').optional().trim(),
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601(),
  vendorQuoteController.getQuotesStatistics
);

// GET /api/admin/vendor-quotes/export/csv - Export to CSV
router.get(
  '/admin/vendor-quotes/export/csv',
  requireAdmin,
  query('itemId').optional().trim(),
  query('status').optional().isIn(['pending', 'reviewed', 'accepted', 'rejected']),
  vendorQuoteController.exportQuotesToCSV
);

// POST /api/admin/vendor-quotes/bulk/status - Bulk update status
router.post(
  '/admin/vendor-quotes/bulk/status',
  requireAdmin,
  body('quoteIds')
    .isArray({ min: 1 }).withMessage('Quote IDs array required'),
  body('quoteIds.*').isMongoId().withMessage('Invalid quote ID format'),
  body('status')
    .isIn(['pending', 'reviewed', 'accepted', 'rejected']).withMessage('Invalid status'),
  vendorQuoteController.bulkUpdateStatus
);

module.exports = router;
