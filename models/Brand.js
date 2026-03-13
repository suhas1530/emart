const mongoose = require("mongoose");

const subCategorySchema = new mongoose.Schema({
    subCategoryName: { type: String, required: true },
    subCategoryImage: String,
});

const categorySchema = new mongoose.Schema({
    categoryName: { type: String, required: true },
    categoryImage: String,
    subCategories: [subCategorySchema],
});

const BrandSchema = new mongoose.Schema(
    {
        name: { type: String, required: true, alias: 'brandName' },
        image: { type: String, alias: 'brandImage' },
        description: { type: String },
        status: {
            type: String,
            enum: ["Publish", "Hold"],
            default: "Publish",
        },
        categories: [categorySchema],
        // Keep products as sub-documents for backward compatibility with existing controllers
        // if needed, but the user plan suggests a separate Product model.
        // We will define Product separately but can still keep this array if the current 
        // system relies on it.
        products: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }]
    },
    { timestamps: true }
);

module.exports = mongoose.model("Brand", BrandSchema);
