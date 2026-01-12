const mongoose = require('mongoose');

const BasketItemSchema = new mongoose.Schema({
  // Product Information
  productName: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  productImage: {
    type: String,
    default: null
  },
  variant: {
    name: {
      type: String,
      default: 'Standard'
    },
    color: {
      type: String,
      default: null
    },
    size: {
      type: String,
      default: null
    },
    // Additional variant properties
    properties: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
    default: 1
  },

  // Member Information
  memberId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Member',
    index: true
  },
  memberName: {
    type: String,
    default: null
  },
  memberEmail: {
    type: String,
    default: null
  },
  memberPhone: {
    type: String,
    default: null
  },

  // Member Communication
  memberNote: {
    type: String,
    default: '',
    maxlength: 500
  },
  memberMessage: {
    type: String,
    default: '',
    maxlength: 1000
  },

  // Pricing Information
  basePrice: {
    type: Number,
    default: null
  },
  quotedPrice: {
    type: Number,
    default: null
  },
  totalPrice: {
    type: Number,
    default: null
  },

  // Status
  status: {
    type: String,
    enum: ['pending', 'quoted', 'ordered', 'delivered', 'cancelled'],
    default: 'pending',
    index: true
  },

  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  deletedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true,
  collection: 'basketItems'
});

// Index for common queries
BasketItemSchema.index({ memberId: 1, createdAt: -1 });
BasketItemSchema.index({ status: 1, createdAt: -1 });
BasketItemSchema.index({ deletedAt: 1 });

// Middleware to update updatedAt
BasketItemSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Virtual for formatted price
BasketItemSchema.virtual('formattedPrice').get(function() {
  return this.totalPrice ? `₹${this.totalPrice.toFixed(2)}` : null;
});

// Exclude soft-deleted items by default
BasketItemSchema.query.active = function() {
  return this.where({ deletedAt: null });
};

module.exports = mongoose.model('BasketItem', BasketItemSchema);
