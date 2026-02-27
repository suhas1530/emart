// routes/vendorroutes.js - Vendor Quote Routes with all endpoints
const express = require('express');
const router = express.Router();
const { body, query, param, validationResult } = require('express-validator');
const vendorQuoteController = require('../controllers/vendorQuoteController');
const axios = require('axios');
const VendorQuoteRequest = require('../models/VendorQuoteRequest');
const VendorQuote = require('../models/VendorQuote');

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

// Error handling middleware for validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  next();
};

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
  handleValidationErrors,
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

// ==================== PUBLIC / SHARED ROUTES ====================

// GET /api/vendor-quotes - Get all VendorQuoteRequest documents grouped by order,
// showing all vendor quotes per product. Sorted by latest createdAt.
router.get('/vendor-quotes', async (req, res) => {
  try {
    // Fetch all VendorQuoteRequest documents, sorted newest first
    const requests = await VendorQuoteRequest.find({})
      .sort({ createdAt: -1 })
      .lean();

    // ─── Transform each VendorQuoteRequest into the response shape ───
    // A single VendorQuoteRequest document represents ONE vendor's submission
    // for an order (containing multiple products/items).
    // We expose them as-is but also group by orderId so consumers can
    // aggregate multiple vendor quotes for the same order.

    // Build a map: orderId → { orderId, products: { productId → productEntry }, createdAt }
    const orderMap = new Map();

    for (const req of requests) {
      const orderId = req.orderId || 'UNKNOWN';

      if (!orderMap.has(orderId)) {
        orderMap.set(orderId, {
          _id: req._id,           // Use first doc's _id as the order key
          orderId,
          products: new Map(),
          createdAt: req.createdAt
        });
      }

      const orderEntry = orderMap.get(orderId);

      // Use the most-recent createdAt for the order group
      if (new Date(req.createdAt) > new Date(orderEntry.createdAt)) {
        orderEntry.createdAt = req.createdAt;
        orderEntry._id = req._id;
      }

      // Add vendor quote to each product in this request
      for (const item of (req.items || [])) {
        const productKey = `${item.productId}::${item.variantId || ''}`;

        if (!orderEntry.products.has(productKey)) {
          orderEntry.products.set(productKey, {
            productId: item.productId || '',
            name: item.productName || 'Unknown Product',
            image: item.image || '',
            quantity: item.requestedQty || 0,
            vendorQuotes: []
          });
        }

        const productEntry = orderEntry.products.get(productKey);

        // Only add vendor quote if a price was submitted
        productEntry.vendorQuotes.push({
          requestId: req._id,           // VendorQuoteRequest doc ID for status updates
          vendorId: req.vendorId || null,
          vendorName: req.vendorName || 'Unknown Vendor',
          vendorEmail: req.vendorEmail || null,
          price: item.vendorPrice ?? null,
          message: item.vendorRemark || '',
          status: req.status || 'pending',
          submittedAt: req.submittedAt || req.createdAt
        });
      }
    }

    // Convert map to array response
    const result = Array.from(orderMap.values()).map(order => ({
      _id: order._id,
      orderId: order.orderId,
      products: Array.from(order.products.values()),
      createdAt: order.createdAt
    }));

    return res.status(200).json(result);

  } catch (error) {
    console.error('❌ Error fetching all vendor quotes:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching vendor quotes',
      error: error.message
    });
  }
});

// PATCH /api/vendor-quote-requests/:requestId/status - Accept or Reject a vendor's quote request
router.patch('/vendor-quote-requests/:requestId/status', async (req, res) => {
  try {
    const { requestId } = req.params;
    const { status } = req.body;

    const validStatuses = ['pending', 'submitted', 'approved', 'accepted', 'rejected'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
      });
    }

    if (!requestId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ success: false, message: 'Invalid request ID' });
    }

    const updated = await VendorQuoteRequest.findByIdAndUpdate(
      requestId,
      { status },
      { new: true, lean: true }
    );

    if (!updated) {
      return res.status(404).json({ success: false, message: 'Quote request not found' });
    }

    return res.status(200).json({
      success: true,
      message: `Status updated to '${status}'`,
      requestId: updated._id,
      status: updated.status
    });

  } catch (error) {
    console.error('❌ Error updating vendor quote request status:', error);
    return res.status(500).json({
      success: false,
      message: 'Error updating status',
      error: error.message
    });
  }
});

// GET /api/vendor-quotes/:id - Get a single vendor quote by ID (supports both VendorQuoteRequest and VendorQuote)
router.get('/vendor-quotes/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || !id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ success: false, message: 'Invalid quote ID' });
    }

    // Try VendorQuoteRequest first (multi-product)
    let requestDoc = await VendorQuoteRequest.findById(id).lean();

    if (requestDoc) {
      const totalAmount = (requestDoc.items || [])
        .filter(it => typeof it.vendorPrice === 'number')
        .reduce((sum, it) => sum + it.vendorPrice * (it.requestedQty || 1), 0);

      const products = (requestDoc.items || []).map(it => ({
        productId: it.productId || '',
        productName: it.productName || 'Unknown Product',
        productImage: it.image || '',
        variantName: it.variantName || 'Standard',
        quantity: it.requestedQty || 0,
        vendorPrice: it.vendorPrice || 0,
        totalPrice: (it.vendorPrice || 0) * (it.requestedQty || 0),
        vendorRemark: it.vendorRemark || ''
      }));

      return res.status(200).json({
        success: true,
        quoteType: 'multi',
        quote: {
          _id: requestDoc._id,
          vendorName: requestDoc.vendorName || 'N/A',
          vendorEmail: requestDoc.vendorEmail || 'N/A',
          vendorPhone: requestDoc.vendorPhone || null,
          totalAmount,
          products,
          status: requestDoc.status,
          createdAt: requestDoc.createdAt,
          submittedAt: requestDoc.submittedAt
        }
      });
    }

    // Fall back to VendorQuote (single product / legacy)
    const singleQuote = await VendorQuote.findById(id).lean();

    if (singleQuote) {
      const totalAmount = singleQuote.quotedPrice || 0;

      const products = [{
        productId: singleQuote.itemId || '',
        productName: singleQuote.productName || 'Unknown Product',
        productImage: singleQuote.productImage || '',
        variantName: 'Standard',
        quantity: 1,
        vendorPrice: singleQuote.quotedPrice || 0,
        totalPrice: singleQuote.quotedPrice || 0,
        vendorRemark: singleQuote.remarks || ''
      }];

      return res.status(200).json({
        success: true,
        quoteType: 'single',
        quote: {
          _id: singleQuote._id,
          vendorName: singleQuote.vendorName || 'N/A',
          vendorEmail: singleQuote.vendorEmail || 'N/A',
          vendorPhone: singleQuote.vendorPhone || null,
          totalAmount,
          products,
          status: singleQuote.status,
          createdAt: singleQuote.createdAt,
          submittedAt: singleQuote.submittedAt
        }
      });
    }

    return res.status(404).json({ success: false, message: 'Quote not found' });

  } catch (error) {
    console.error('❌ Error fetching vendor quote by ID:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching vendor quote',
      error: error.message
    });
  }
});

// ==================== ADMIN ROUTES ====================

// Multi-item quote request creation (admin)
router.post(
  '/admin/vendor-quote-requests',
  requireAdmin,
  body('orderId').trim().notEmpty().withMessage('Order ID is required'),
  body('items')
    .isArray({ min: 1 })
    .withMessage('Items array is required'),
  body('items.*.productId')
    .trim()
    .notEmpty()
    .withMessage('productId is required for each item'),
  body('items.*.requestedQty')
    .isFloat({ min: 1 })
    .withMessage('requestedQty must be at least 1'),
  body('vendorId').optional().trim(),
  body('vendorName').optional().trim(),
  body('vendorEmail').optional().isEmail().withMessage('Invalid vendorEmail'),
  vendorQuoteController.createMultiItemQuoteRequest
);

// Admin list multi-item quote requests
router.get(
  '/admin/vendor-quote-requests',
  requireAdmin,
  query('orderId').optional().trim(),
  query('status').optional().isIn(['pending', 'submitted']),
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  vendorQuoteController.getAdminMultiItemQuotes
);

// Public: get multi-item quote details by token
router.get(
  '/quote-request/:token',
  param('token').trim().notEmpty().withMessage('Token is required'),
  vendorQuoteController.getMultiItemQuoteByToken
);

// Public: submit multi-item quote by token
router.post(
  '/quote-request/:token/submit',
  param('token').trim().notEmpty().withMessage('Token is required'),
  body('items')
    .isArray({ min: 1 })
    .withMessage('Items array is required'),
  vendorQuoteController.submitMultiItemQuote
);

// POST /api/admin/vendor-quotes - Submit vendor quote (supports both itemId and productId/variantId)
router.post(
  '/admin/vendor-quotes',
  [
    body('vendorName')
      .trim()
      .notEmpty().withMessage('Vendor name is required')
      .isLength({ min: 2, max: 100 }).withMessage('Vendor name must be 2-100 characters'),
    body('vendorEmail')
      .trim()
      .toLowerCase()
      .isEmail().withMessage('Invalid email address'),
    body('vendorPhone')
      .optional()
      .trim(),
    body('quotedPrice')
      .notEmpty().withMessage('Quoted price is required')
      .isFloat({ min: 0 }).withMessage('Price must be a positive number'),
    body('remarks')
      .optional()
      .trim()
      .isLength({ max: 500 }).withMessage('Remarks cannot exceed 500 characters'),
    // Accept either itemId OR (productId + variantId)
    body('itemId').optional().trim(),
    body('productId').optional().trim(),
    body('variantId').optional().trim(),
    body('productName').optional().trim(),
    body('productImage').optional().trim()
  ],
  handleValidationErrors,
  vendorQuoteController.submitQuote
);

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

// GET /api/admin/vendor-quotes/stats/summary - Get statistics
// NOTE: Must be defined BEFORE /:quoteId to avoid being swallowed by the param route
router.get(
  '/admin/vendor-quotes/stats/summary',
  requireAdmin,
  query('itemId').optional().trim(),
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601(),
  vendorQuoteController.getQuotesStatistics
);

// GET /api/admin/vendor-quotes/export/csv - Export to CSV
// NOTE: Must be defined BEFORE /:quoteId to avoid being swallowed by the param route
router.get(
  '/admin/vendor-quotes/export/csv',
  requireAdmin,
  query('itemId').optional().trim(),
  query('status').optional().isIn(['pending', 'reviewed', 'accepted', 'rejected']),
  vendorQuoteController.exportQuotesToCSV
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

// NOTE: stats/summary and export/csv have been moved BEFORE /:quoteId above
// to prevent them from being incorrectly matched as a quoteId parameter.

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
