const express = require("express");
const router = express.Router();
const brandController = require("../controllers/brandController");

// Public User Routes
// GET /api/brands
router.get("/", brandController.getPublishedBrands);

// GET /api/brands/products
router.get("/products", brandController.getPublishedProducts);

module.exports = router;
