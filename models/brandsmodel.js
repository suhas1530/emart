const mongoose = require("mongoose");

const subCategorySchema = new mongoose.Schema({
  subCategoryName: String,
  subCategoryImage: String,
});

const categorySchema = new mongoose.Schema({
  categoryName: String,
  categoryImage: String,
  subCategories: [subCategorySchema],
});

const variantSchema = new mongoose.Schema({
  name: { type: String, required: true },
  stock: { type: Number, required: true, default: 0 },
  unit: { type: String, required: true },
  otherUnit: { type: String },
  weight: { type: Number, default: 0 },
  listPrice: { type: Number, required: true },
  discount: { type: Number, default: 0 },
  profit: { type: Number, default: 0 },
  gst: { type: Number, default: 18 },
  tax: { type: Number, default: 18 },
  finalPrice: { type: Number, required: true }
});

const productSchema = new mongoose.Schema({
  access: { type: String, enum: ["Member", "User", "Both"], default: "Both" },
  brandId: { type: mongoose.Schema.Types.ObjectId, ref: 'Brand' },
  brandName: String,
  categoryId: mongoose.Schema.Types.ObjectId,
  categoryName: String,
  subCategoryId: mongoose.Schema.Types.ObjectId,
  subCategoryName: String,
  productName: { type: String, required: true },
  description: { type: String },
  images: [String],
  catalog: String,
  videoLink: String,
  enquiry: { type: Boolean, default: true },
  hsnCode: String,
  variants: [variantSchema],

  // ── Mixed type so Mongoose stores null/number reliably in subdocuments ──
secondaryThreshold: { type: Number, default: null },
tertiaryThreshold:  { type: Number, default: null },

}, { timestamps: true });

const brandSchema = new mongoose.Schema(
  {
    brandName: { type: String, required: true },
    brandImage: String,
    status: { type: String, enum: ["publish", "hold"], default: "publish" },
    categories: [categorySchema],
    products: [productSchema]
  },
  { timestamps: true }
);

module.exports = mongoose.model("Brand", brandSchema);