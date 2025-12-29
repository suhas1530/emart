// const express = require("express");
// const router = express.Router();
// const upload = require("../middlewares/upload");
// const controller = require("../controllers/brandscontroller");

// router.post("/brand", upload.single("brandImage"), controller.addBrand);

// router.post(
//   "/category/:brandId",
//   upload.single("categoryImage"),
//   controller.addCategory
// );

// router.post(
//   "/subcategory/:brandId/:categoryId",
//   upload.single("subCategoryImage"),
//   controller.addSubCategory
// );

// // DELETE
// router.delete("/brand/:brandId", controller.deleteBrand);
// router.delete("/category/:brandId/:categoryId", controller.deleteCategory);
// router.delete(
//   "/subcategory/:brandId/:categoryId/:subCategoryId",
//   controller.deleteSubCategory
// );
// router.put("/brand/:brandId", upload.single("brandImage"), controller.updateBrand);
// router.put("/category/:brandId/:categoryId", upload.single("categoryImage"), controller.updateCategory);
// router.put("/subcategory/:brandId/:categoryId/:subCategoryId", upload.single("subCategoryImage"), controller.updateSubCategory);
// // GET
// router.get("/", controller.getBrands);

// module.exports = router;
// 1


const express = require("express");
const router = express.Router();
const upload = require("../middleware/upload");
const controller = require("../controllers/brandscontroller");

// ==================== BRAND ROUTES ====================
router.post("/brand", upload.single("brandImage"), controller.addBrand);
router.put("/brand/:brandId", upload.single("brandImage"), controller.updateBrand);
router.delete("/brand/:brandId", controller.deleteBrand);
router.get("/", controller.getBrands);
router.get("/brand/:brandId", controller.getBrand);

// ==================== CATEGORY ROUTES ====================
router.post("/category/:brandId", upload.single("categoryImage"), controller.addCategory);
router.put("/category/:brandId/:categoryId", upload.single("categoryImage"), controller.updateCategory);
router.delete("/category/:brandId/:categoryId", controller.deleteCategory);

// ==================== SUB-CATEGORY ROUTES ====================
router.post("/subcategory/:brandId/:categoryId", upload.single("subCategoryImage"), controller.addSubCategory);
router.put("/subcategory/:brandId/:categoryId/:subCategoryId", upload.single("subCategoryImage"), controller.updateSubCategory);
router.delete("/subcategory/:brandId/:categoryId/:subCategoryId", controller.deleteSubCategory);

// ==================== PRODUCT ROUTES ====================

// Add product with multiple images and catalog
router.post(
  "/product",
  upload.fields([
    { name: 'images', maxCount: 6 },
    { name: 'catalog', maxCount: 1 }
  ]),
  controller.addProduct
);

// Get all products (from all brands)
router.get("/products/all", controller.getAllProducts);

// Get products by brand
router.get("/products/brand/:brandId", controller.getProductsByBrand);

// Get products by category
router.get("/products/brand/:brandId/category/:categoryId", controller.getProductsByCategory);

// Get products by sub-category
router.get("/products/brand/:brandId/subcategory/:subCategoryId", controller.getProductsBySubCategory);

// Get single product
router.get("/product/:brandId/:productId", controller.getProduct);

// Update product
router.put(
  "/product/:brandId/:productId",
  upload.fields([
    { name: 'images', maxCount: 6 },
    { name: 'catalog', maxCount: 1 }
  ]),
  controller.updateProduct
);

// Delete product
router.delete("/product/:brandId/:productId", controller.deleteProduct);

module.exports = router;