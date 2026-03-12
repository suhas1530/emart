const mongoose = require("mongoose");

/* ================= BUSINESS PROFILE ================= */
const businessProfileSchema = new mongoose.Schema({
  memberId: { type: String, required: true, unique: true },
  businessName: { type: String },
  ownerName: { type: String },
  gstin: { type: String },
  address: { type: String },
  pincode: { type: String },
  businessDescription: { type: String },
  // File paths stored as strings
  documents: [{ type: String }],   // uploaded doc/image paths
  ownerImage: { type: String },    // owner photo path
  businessLogo: { type: String },  // logo path
  email: { type: String },
  isComplete: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

/* ================= SITE ================= */
const siteSchema = new mongoose.Schema({
  memberId: { type: String, required: true },
  siteName: { type: String, required: true },
  siteAddress: { type: String },
  // Selected product IDs from basket or tracking
  basketProductIds: [{ type: String }],
  trackingProductIds: [{ type: String }],
  // Snapshot of selected product names for display
  basketProducts: [{ type: mongoose.Schema.Types.Mixed }],
  trackingProducts: [{ type: mongoose.Schema.Types.Mixed }],
  note: { type: String },
  messageToAdmin: { type: String },
  anyDetails: { type: String },
  status: {
    type: String,
    enum: ["Pending", "Confirmed", "In Progress", "Completed", "Cancelled"],
    default: "Pending"
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const BusinessProfile = mongoose.model("BusinessProfile", businessProfileSchema);
const Site = mongoose.model("Site", siteSchema);

module.exports = { BusinessProfile, Site };