const mongoose = require('mongoose');

const vendorQuoteRequestItemSchema = new mongoose.Schema(
  {
    productId: {
      type: String,
      required: [true, 'Product ID is required'],
      trim: true,
    },
    variantId: {
      type: String,
      trim: true,
      default: null,
    },
    productName: {
      type: String,
      trim: true,
      default: null,
    },
    variantName: {
      type: String,
      trim: true,
      default: null,
    },
    image: {
      type: String,
      trim: true,
      default: null,
    },
    requestedQty: {
      type: Number,
      required: [true, 'Requested quantity is required'],
      min: [1, 'Requested quantity must be at least 1'],
    },
    vendorPrice: {
      type: Number,
      min: [0, 'Vendor price cannot be negative'],
      default: null,
    },
    vendorRemark: {
      type: String,
      trim: true,
      default: null,
      maxlength: [500, 'Remark cannot exceed 500 characters'],
    },
  },
  { _id: false }
);

const vendorQuoteRequestSchema = new mongoose.Schema(
  {
    orderId: {
      type: String,
      required: [true, 'Order ID is required'],
      trim: true,
      index: true,
    },
    vendorId: {
      type: String,
      trim: true,
      default: null,
      index: true,
    },
    vendorName: {
      type: String,
      trim: true,
      default: null,
    },
    vendorEmail: {
      type: String,
      trim: true,
      lowercase: true,
      default: null,
    },
    items: {
      type: [vendorQuoteRequestItemSchema],
      validate: [
        {
          validator: function (arr) {
            return Array.isArray(arr) && arr.length > 0;
          },
          message: 'At least one item is required',
        },
        {
          validator: function (arr) {
            const seen = new Set();
            for (const item of arr) {
              const key = `${item.productId}::${item.variantId || ''}`;
              if (seen.has(key)) {
                return false;
              }
              seen.add(key);
            }
            return true;
          },
          message: 'Duplicate product/variant combinations are not allowed',
        },
      ],
    },
    status: {
      type: String,
      enum: {
        values: ['pending', 'submitted', 'approved', 'accepted', 'rejected'],
        message: 'Status must be one of: pending, submitted, approved, accepted, rejected',
      },
      default: 'pending',
      index: true,
    },
    token: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    tokenExpiresAt: {
      type: Date,
      required: true,
      index: true,
    },
    submittedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

vendorQuoteRequestSchema.methods.isTokenValid = function () {
  if (!this.tokenExpiresAt) return false;
  if (this.status === 'submitted') return false;
  return this.tokenExpiresAt > new Date();
};

module.exports = mongoose.model('VendorQuoteRequest', vendorQuoteRequestSchema);

