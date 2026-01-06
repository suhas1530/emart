// models/VendorQuote.js (Your own collection)
const mongoose = require('mongoose');

const vendorQuoteSchema = new mongoose.Schema({
  // Reference to external BasketItem ID
  externalItemId: {
    type: String,
    required: true,
    index: true
  },
  vendorName: {
    type: String,
    required: true
  },
  vendorEmail: {
    type: String,
    required: true
  },
  vendorPhone: String,
  quotedPrice: {
    type: Number,
    required: true,
    min: 0
  },
  remarks: String,
  submittedAt: {
    type: Date,
    default: Date.now
  },
  // Additional metadata
  source: {
    type: String,
    default: 'vendor-portal'
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  }
});

// Index for faster queries
vendorQuoteSchema.index({ externalItemId: 1, submittedAt: -1 });
vendorQuoteSchema.index({ vendorEmail: 1, externalItemId: 1 });

module.exports = mongoose.model('VendorQuote', vendorQuoteSchema);