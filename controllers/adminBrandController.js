const Brand = require("../models/brandsmodel");
// GET all brands (Admin)
exports.getAllBrands = async (req, res) => {
    try {
        const brands = await Brand.find().sort({ createdAt: -1 });
        res.status(200).json(brands);
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// CREATE a brand
exports.createBrand = async (req, res) => {
    try {
        const { brandName, brandImage, description, status } = req.body;
        const newBrand = new Brand({
            brandName,
            brandImage,
            description,
            status: status || "Publish",
        });
        await newBrand.save();
        res.status(201).json(newBrand);
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// UPDATE brand details
exports.updateBrand = async (req, res) => {
    try {
        const { id } = req.params;
        const updatedBrand = await Brand.findByIdAndUpdate(id, req.body, {
            new: true,
            runValidators: true,
        });
        if (!updatedBrand) {
            return res.status(404).json({ message: "Brand not found" });
        }
        res.status(200).json(updatedBrand);
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// PATCH update brand status (Publish / Hold)
exports.updateBrandStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!["Publish", "Hold"].includes(status)) {
            return res.status(400).json({ message: "Invalid status value" });
        }

        const updatedBrand = await Brand.findByIdAndUpdate(
            id,
            { status },
            { new: true }
        );

        if (!updatedBrand) {
            return res.status(404).json({ message: "Brand not found" });
        }

        res.status(200).json(updatedBrand);
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// DELETE brand
exports.deleteBrand = async (req, res) => {
    try {
        const { id } = req.params;
        const deletedBrand = await Brand.findByIdAndDelete(id);
        if (!deletedBrand) {
            return res.status(404).json({ message: "Brand not found" });
        }
        res.status(200).json({ message: "Brand deleted successfully" });
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

