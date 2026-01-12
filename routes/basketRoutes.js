const express = require('express');
const router = express.Router();
const { body, param, query, validationResult } = require('express-validator');
const basketController = require('../controllers/basketController');

// ==================== VALIDATION MIDDLEWARE ====================

const validateBasketItem = [
  body('productName')
    .trim()
    .notEmpty().withMessage('Product name is required')
    .isLength({ min: 2, max: 200 }).withMessage('Product name must be 2-200 characters'),
  body('quantity')
    .notEmpty().withMessage('Quantity is required')
    .isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
  body('variant').optional().isObject().withMessage('Variant must be an object'),
  body('memberNote').optional().trim().isLength({ max: 500 }).withMessage('Member note cannot exceed 500 characters'),
  body('memberMessage').optional().trim().isLength({ max: 1000 }).withMessage('Member message cannot exceed 1000 characters'),
  body('basePrice').optional().isFloat({ min: 0 }).withMessage('Base price must be positive'),
  body('totalPrice').optional().isFloat({ min: 0 }).withMessage('Total price must be positive')
];

const validateItemId = [
  param('itemId')
    .notEmpty().withMessage('Item ID is required')
    .isMongoId().withMessage('Invalid item ID format')
];

// Error handling middleware
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

// ==================== PUBLIC ROUTES ====================

// @route   GET /api/admin/basket-items
// @desc    Get all active basket items (for vendor quote form)
// @access  Public
router.get('/', basketController.getBasketItems);

// @route   GET /api/admin/basket-item/:itemId
// @desc    Get single basket item by ID
// @access  Public
router.get('/:itemId', validateItemId, handleValidationErrors, basketController.getBasketItem);

// @route   GET /api/admin/basket-item/:itemId/for-vendor
// @desc    Get basket item data specifically for vendor quote form
// @access  Public
router.get('/:itemId/for-vendor', validateItemId, handleValidationErrors, basketController.getBasketItemForVendor);

// ==================== ADMIN ROUTES (Protected) ====================

// @route   POST /api/admin/basket-items
// @desc    Create a new basket item
// @access  Admin
router.post('/', validateBasketItem, handleValidationErrors, basketController.createBasketItem);

// @route   PUT /api/admin/basket-items/:itemId
// @desc    Update basket item
// @access  Admin
router.put('/:itemId', validateItemId, handleValidationErrors, basketController.updateBasketItem);

// @route   DELETE /api/admin/basket-items/:itemId
// @desc    Delete basket item (soft delete)
// @access  Admin
router.delete('/:itemId', validateItemId, handleValidationErrors, basketController.deleteBasketItem);

module.exports = router;
