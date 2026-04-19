const express = require("express");
const router = express.Router();
const upload = require("../middleware/upload");
const brandController = require("../controllers/brandController");

// ==================== BRAND ROUTES ====================
router.post("/brand", upload.single("brandImage"), brandController.addBrand);
router.put("/brand/:brandId", upload.single("brandImage"), brandController.updateBrand);
router.delete("/brand/:brandId", brandController.deleteBrand);
router.get("/", brandController.getBrands);                          // supports ?status=Publish
router.get("/brand/:brandId", brandController.getBrand);
router.patch("/:brandId/status", brandController.updateBrandStatus); // admin toggle

// ==================== CATEGORY ROUTES ====================
router.post("/category/:brandId", upload.single("categoryImage"), brandController.addCategory);
router.put("/category/:brandId/:categoryId", upload.single("categoryImage"), brandController.updateCategory);
router.delete("/category/:brandId/:categoryId", brandController.deleteCategory);

// ==================== SUB-CATEGORY ROUTES ====================
router.post("/subcategory/:brandId/:categoryId", upload.single("subCategoryImage"), brandController.addSubCategory);
router.put("/subcategory/:brandId/:categoryId/:subCategoryId", upload.single("subCategoryImage"), brandController.updateSubCategory);
router.delete("/subcategory/:brandId/:categoryId/:subCategoryId", brandController.deleteSubCategory);

// ==================== PRODUCT ROUTES ====================
router.post(
  "/product",
  upload.fields([
    { name: "images", maxCount: 6 },
    { name: "catalog", maxCount: 1 }
  ]),
  brandController.addProduct
);

router.get("/products", brandController.getAllProducts);              // supports ?status=Publish
router.get("/products/all", brandController.getAllProducts);          // same, for frontend compatibility
router.get("/products/brand/:brandId", brandController.getProductsByBrand);
router.get("/products/brand/:brandId/category/:categoryId", brandController.getProductsByCategory);
router.get("/products/brand/:brandId/subcategory/:subCategoryId", brandController.getProductsBySubCategory);

// GET SINGLE PRODUCT — supports both /product/:brandId/:productId and /product?brandId=x&productId=y
router.get("/product/:brandId/:productId", brandController.getProduct);
router.get("/product", async (req, res) => {
  const { brandId, productId } = req.query;
  if (!brandId || !productId) {
    return res.status(400).json({ error: "brandId and productId are required" });
  }
  req.params.brandId = brandId;
  req.params.productId = productId;
  return brandController.getProduct(req, res);
});

router.put(
  "/product/:brandId/:productId",
  upload.fields([
    { name: "images", maxCount: 6 },
    { name: "catalog", maxCount: 1 }
  ]),
  brandController.updateProduct
);
router.delete("/product/:brandId/:productId", brandController.deleteProduct);

module.exports = router;
