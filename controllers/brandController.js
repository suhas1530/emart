const Brand = require("../models/Brand");
const Product = require("../models/Product");

// GET published brands only (User Panel)
exports.getPublishedBrands = async (req, res) => {
    try {
        const brands = await Brand.find({ status: "Publish" }).sort({ brandName: 1 });
        res.status(200).json(brands);
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// GET products filtered by brand status (User Panel)
exports.getPublishedProducts = async (req, res) => {
    try {
        // Find products that are active AND belong to a published brand
        // Note: Since Product and Brand are separate in our new model, we use populate
        const products = await Product.find({ isActive: true })
            .populate({
                path: "brand",
                match: { status: "Publish" },
            })
            .sort({ createdAt: -1 });

        // Filter out products where the populated brand is null (meaning the brand didn't match the criteria)
        const filteredProducts = products.filter((p) => p.brand !== null);

        res.status(200).json(filteredProducts);
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};
