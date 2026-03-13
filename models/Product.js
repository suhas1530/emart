const mongoose = require("mongoose");

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

const ProductSchema = new mongoose.Schema(
    {
        productName: { type: String, required: true },
        description: { type: String },
        brand: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Brand",
            required: true,
        },
        brandName: String,
        categoryId: mongoose.Schema.Types.ObjectId,
        categoryName: String,
        subCategoryId: mongoose.Schema.Types.ObjectId,
        subCategoryName: String,
        images: [String],
        catalog: String,
        videoLink: String,
        enquiry: { type: Boolean, default: true },
        hsnCode: String,
        isActive: { type: Boolean, default: true },
        variants: [variantSchema],
        access: {
            type: String,
            enum: ["Member", "User", "Both"],
            default: "Both"
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model("Product", ProductSchema);
