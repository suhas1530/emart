const BasketItem = require('../models/BasketItem');

// @desc    Get all active basket items (with pagination)
// @route   GET /api/admin/basket-items
// @access  Admin
exports.getBasketItems = async (req, res) => {
  try {
    const { page = 1, limit = 50, status, memberId, search } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build query
    let query = { deletedAt: null };

    if (status) {
      query.status = status;
    }

    if (memberId) {
      query.memberId = memberId;
    }

    if (search) {
      query.$or = [
        { productName: { $regex: search, $options: 'i' } },
        { memberName: { $regex: search, $options: 'i' } },
        { memberEmail: { $regex: search, $options: 'i' } }
      ];
    }

    // Fetch items with pagination
    const items = await BasketItem.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    // Get total count
    const total = await BasketItem.countDocuments(query);

    return res.status(200).json({
      success: true,
      items,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching basket items:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching basket items',
      error: error.message
    });
  }
};

// @desc    Get single basket item by ID
// @route   GET /api/admin/basket-item/:itemId
// @access  Admin
exports.getBasketItem = async (req, res) => {
  try {
    const { itemId } = req.params;

    if (!itemId) {
      return res.status(400).json({
        success: false,
        message: 'Item ID is required'
      });
    }

    // Try to find by MongoDB ID
    let item = await BasketItem.findOne({
      _id: itemId,
      deletedAt: null
    }).lean();

    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Basket item not found',
        itemId: itemId
      });
    }

    return res.status(200).json({
      success: true,
      item
    });
  } catch (error) {
    console.error('Error fetching basket item:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching basket item',
      error: error.message
    });
  }
};

// @desc    Create a new basket item
// @route   POST /api/admin/basket-items
// @access  Admin
exports.createBasketItem = async (req, res) => {
  try {
    const {
      productName,
      productImage,
      variant,
      quantity,
      memberId,
      memberName,
      memberEmail,
      memberPhone,
      memberNote,
      memberMessage,
      basePrice,
      totalPrice
    } = req.body;

    // Validation
    if (!productName || !quantity) {
      return res.status(400).json({
        success: false,
        message: 'Product name and quantity are required'
      });
    }

    // Create new basket item
    const item = new BasketItem({
      productName: productName.trim(),
      productImage: productImage || null,
      variant: variant || { name: 'Standard' },
      quantity: parseInt(quantity),
      memberId: memberId || null,
      memberName: memberName ? memberName.trim() : null,
      memberEmail: memberEmail ? memberEmail.toLowerCase().trim() : null,
      memberPhone: memberPhone ? memberPhone.trim() : null,
      memberNote: memberNote ? memberNote.trim() : '',
      memberMessage: memberMessage ? memberMessage.trim() : '',
      basePrice: basePrice ? parseFloat(basePrice) : null,
      totalPrice: totalPrice ? parseFloat(totalPrice) : null,
      status: 'pending'
    });

    // Save to database
    await item.save();

    return res.status(201).json({
      success: true,
      message: 'Basket item created successfully',
      item
    });
  } catch (error) {
    console.error('Error creating basket item:', error);
    return res.status(500).json({
      success: false,
      message: 'Error creating basket item',
      error: error.message
    });
  }
};

// @desc    Update basket item
// @route   PUT /api/admin/basket-items/:itemId
// @access  Admin
exports.updateBasketItem = async (req, res) => {
  try {
    const { itemId } = req.params;
    const updates = req.body;

    // Remove fields that shouldn't be updated
    delete updates._id;
    delete updates.createdAt;

    const item = await BasketItem.findByIdAndUpdate(
      itemId,
      { ...updates, updatedAt: new Date() },
      { new: true, runValidators: true }
    );

    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Basket item not found'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Basket item updated successfully',
      item
    });
  } catch (error) {
    console.error('Error updating basket item:', error);
    return res.status(500).json({
      success: false,
      message: 'Error updating basket item',
      error: error.message
    });
  }
};

// @desc    Delete basket item (soft delete)
// @route   DELETE /api/admin/basket-items/:itemId
// @access  Admin
exports.deleteBasketItem = async (req, res) => {
  try {
    const { itemId } = req.params;

    const item = await BasketItem.findByIdAndUpdate(
      itemId,
      { deletedAt: new Date() },
      { new: true }
    );

    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Basket item not found'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Basket item deleted successfully',
      item
    });
  } catch (error) {
    console.error('Error deleting basket item:', error);
    return res.status(500).json({
      success: false,
      message: 'Error deleting basket item',
      error: error.message
    });
  }
};

// @desc    Get basket item for vendor (public - for vendor quote form)
// @route   GET /api/admin/basket-items/:itemId/for-vendor
// @access  Public
exports.getBasketItemForVendor = async (req, res) => {
  try {
    const { itemId } = req.params;

    const item = await BasketItem.findOne({
      _id: itemId,
      deletedAt: null
    }).lean();

    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Item not found'
      });
    }

    // Return vendor-safe version (exclude member contact details if needed)
    return res.status(200).json({
      success: true,
      item: {
        _id: item._id,
        productName: item.productName,
        productImage: item.productImage,
        variant: item.variant,
        quantity: item.quantity,
        memberNote: item.memberNote,
        memberMessage: item.memberMessage,
        basePrice: item.basePrice,
        createdAt: item.createdAt
      }
    });
  } catch (error) {
    console.error('Error fetching basket item for vendor:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching item',
      error: error.message
    });
  }
};
