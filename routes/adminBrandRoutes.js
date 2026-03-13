const express = require("express");
const router = express.Router();
const adminBrandController = require("../controllers/adminBrandController");

const { authenticateAdmin } = require("../middleware/authMiddleware");

// All routes here should be protected
router.use(authenticateAdmin);

// Admin Routes for Brands
router.get("/", adminBrandController.getAllBrands);
router.post("/", adminBrandController.createBrand);
router.put("/:id", adminBrandController.updateBrand);
router.patch("/:id/status", adminBrandController.updateBrandStatus);
router.delete("/:id", adminBrandController.deleteBrand);

module.exports = router;
