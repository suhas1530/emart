// const mongoose = require("mongoose");

// const subCategorySchema = new mongoose.Schema({
//   subCategoryName: String,
//   subCategoryImage: String,
// });

// const categorySchema = new mongoose.Schema({
//   categoryName: String,
//   categoryImage: String,
//   subCategories: [subCategorySchema],
// });

// const brandSchema = new mongoose.Schema(
//   {
//     brandName: { type: String, required: true },
//     brandImage: String,
//     categories: [categorySchema],
//     products: [
//       {
//         productName: String,
//         price: Number,
//         productImage: String,
//       },
//     ],
//   },
//   { timestamps: true }
// );

// module.exports = mongoose.model("Brand", brandSchema);


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

// Variant Schema for Product
const variantSchema = new mongoose.Schema({
  name: { type: String, required: true },
  stock: { type: Number, required: true, default: 0 },
  unit: { type: String, required: true },
  otherUnit: { type: String },
  weight: { type: Number, default: 0 },
  listPrice: { type: Number, required: true },
  discount: { type: Number, default: 0 },
  profit: { type: Number, default: 0 },
  tax: { type: Number, default: 5 },
  finalPrice: { type: Number, required: true }
});

// Product Schema
const productSchema = new mongoose.Schema({
  access: { 
    type: String, 
    enum: ["Member", "User", "Both"], 
    default: "Both" 
  },
  brandId: { type: mongoose.Schema.Types.ObjectId, ref: 'Brand' },
  brandName: String,
  categoryId: mongoose.Schema.Types.ObjectId,
  categoryName: String,
  subCategoryId: mongoose.Schema.Types.ObjectId,
  subCategoryName: String,
  productName: { type: String, required: true },
  description: { type: String },
  images: [String], // Array of image paths
  catalog: String, // PDF/DOC file path
  videoLink: String,
  enquiry: { type: Boolean, default: true },
  hsnCode: String,
  variants: [variantSchema]
}, { timestamps: true });

const brandSchema = new mongoose.Schema(
  {
    brandName: { type: String, required: true },
    brandImage: String,
    categories: [categorySchema],
    products: [productSchema] // Products stored under brand
  },
  { timestamps: true }
);

module.exports = mongoose.model("Brand", brandSchema);