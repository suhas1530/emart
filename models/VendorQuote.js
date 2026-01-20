// models/VendorQuote.js - Mongoose schema for vendor quotes
const mongoose = require('mongoose');

const vendorQuoteSchema = new mongoose.Schema(
  {
    // Reference to the basket item
    itemId: {
      type: String,
      required: [true, 'Item ID is required'],
      trim: true,
      index: true
    },

    // Product information (for quick reference)
    productName: {
      type: String,
      trim: true,
      default: null
    },
    productImage: {
      type: String,
      trim: true,
      default: null
    },

    // Vendor Information
    vendorName: {
      type: String,
      required: [true, 'Vendor name is required'],
      trim: true
    },

    vendorEmail: {
      type: String,
      required: [true, 'Vendor email is required'],
      trim: true,
      lowercase: true,
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        'Please provide a valid email address'
      ]
    },

    vendorPhone: {
      type: String,
      trim: true,
      default: null,
      match: [
        /^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,9}$/,
        'Please provide a valid phone number'
      ]
    },

    // Quote Details
    quotedPrice: {
      type: Number,
      required: [true, 'Quoted price is required'],
      min: [0, 'Price cannot be negative']
    },

    remarks: {
      type: String,
      trim: true,
      default: null,
      maxlength: [500, 'Remarks cannot exceed 500 characters']
    },

    // Admin Information
    adminNotes: {
      type: String,
      trim: true,
      default: null,
      maxlength: [1000, 'Admin notes cannot exceed 1000 characters']
    },

    // Timestamps
    submittedAt: {
      type: Date,
      default: Date.now,
      index: true
    },

    // Status tracking
    status: {
      type: String,
      enum: {
        values: ['pending', 'reviewed', 'accepted', 'rejected'],
        message: 'Status must be one of: pending, reviewed, accepted, rejected'
      },
      default: 'pending',
      index: true
    },

    // IP address for rate limiting
    ipAddress: {
      type: String,
      trim: true,
      default: null
    },

    // Additional metadata
    lastModifiedBy: {
      type: String,
      trim: true,
      default: null
    },

    lastModifiedAt: {
      type: Date,
      default: null
    },

    // For tracking rejections
    rejectionReason: {
      type: String,
      trim: true,
      default: null
    }
  },
  {
    timestamps: true
  }
);

// Indexes for better query performance
vendorQuoteSchema.index({ itemId: 1, status: 1 });
vendorQuoteSchema.index({ vendorEmail: 1 });
vendorQuoteSchema.index({ submittedAt: -1 });
vendorQuoteSchema.index({ itemId: 1, quotedPrice: 1 });

// Pre-save middleware for validation
vendorQuoteSchema.pre('save', async function() {
  // Sanitize remarks and admin notes
  if (this.remarks) {
    this.remarks = this.remarks.trim().substring(0, 500);
  }
  if (this.adminNotes) {
    this.adminNotes = this.adminNotes.trim().substring(0, 1000);
  }
});

// Instance methods
vendorQuoteSchema.methods.updateStatus = function(newStatus, adminNotes = null) {
  if (!['pending', 'reviewed', 'accepted', 'rejected'].includes(newStatus)) {
    throw new Error('Invalid status value');
  }
  this.status = newStatus;
  this.lastModifiedAt = new Date();
  if (adminNotes) {
    this.adminNotes = adminNotes;
  }
  return this.save();
};

// Static methods
vendorQuoteSchema.statics.getLowestQuoteForItem = function(itemId) {
  return this.findOne({ itemId, status: { $ne: 'rejected' } })
    .sort({ quotedPrice: 1 })
    .exec();
};

vendorQuoteSchema.statics.getQuotesForItem = function(itemId, sortBy = 'quotedPrice') {
  return this.find({ itemId, status: { $ne: 'rejected' } })
    .sort({ [sortBy]: 1 })
    .exec();
};

vendorQuoteSchema.statics.getAdminQuotes = async function(filters = {}, page = 1, limit = 10) {
  const query = { ...filters };
  const skip = (page - 1) * limit;

  const quotes = await this.find(query)
    .sort({ submittedAt: -1 })
    .skip(skip)
    .limit(limit)
    .exec();
  
  const total = await this.countDocuments(query);

  return { quotes, total };
};

vendorQuoteSchema.statics.countQuotes = function(filters = {}) {
  return this.countDocuments(filters);
};

vendorQuoteSchema.statics.getQuotesStatistics = async function() {
  const stats = await this.aggregate([
    {
      $match: { status: { $ne: 'rejected' } }
    },
    {
      $group: {
        _id: null,
        totalQuotes: { $sum: 1 },
        averagePrice: { $avg: '$quotedPrice' },
        minPrice: { $min: '$quotedPrice' },
        maxPrice: { $max: '$quotedPrice' },
        activeVendors: { $addToSet: '$vendorEmail' }
      }
    }
  ]);

  if (stats.length === 0) {
    return {
      totalQuotes: 0,
      averagePrice: 0,
      minPrice: 0,
      maxPrice: 0,
      activeVendors: 0
    };
  }

  return {
    totalQuotes: stats[0].totalQuotes,
    averagePrice: stats[0].averagePrice,
    minPrice: stats[0].minPrice,
    maxPrice: stats[0].maxPrice,
    activeVendors: stats[0].activeVendors.length
  };
};

// Virtual for GST calculation
vendorQuoteSchema.virtual('priceWithGST').get(function() {
  return this.quotedPrice * 1.18;
});

// Ensure virtuals are included when converting to JSON
vendorQuoteSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('VendorQuote', vendorQuoteSchema);