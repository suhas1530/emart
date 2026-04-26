const Brand = require("../models/brandsmodel");
const sharp = require('sharp');
const path = require('path');
const fs = require('fs').promises;

async function processImage(filePath) {
  try {
    const webpFilename = `${Date.now()}-${Math.random().toString(36).substring(7)}.webp`;
    const outputPath = path.join('uploads', webpFilename);
    await fs.mkdir('uploads', { recursive: true });
    await sharp(filePath).resize(800, 800, { fit: 'inside', withoutEnlargement: true }).webp({ quality: 80, effort: 6 }).toFile(outputPath);
    await fs.unlink(filePath);
    return outputPath;
  } catch (error) {
    console.error('Error processing image:', error);
    throw error;
  }
}

async function deleteImage(imagePath) {
  if (!imagePath) return;
  try { await fs.unlink(imagePath); }
  catch (error) { console.error('Error deleting image:', error); }
}

const safeNumber = (value, defaultValue = 0) => {
  const num = Number(value);
  return isNaN(num) || value === '' || value === undefined || value === null ? defaultValue : num;
};

// Returns null for empty/invalid, positive integer otherwise
const parseThreshold = (value) => {
  if (value === undefined || value === null || value === '' || value === 'null') return null;
  const num = parseInt(value, 10);
  return isNaN(num) || num < 1 ? null : num;
};

const sanitizeVariant = (variant) => ({
  name: String(variant.name || '').trim(),
  stock: safeNumber(variant.stock, 0),
  unit: String(variant.unit || 'KG'),
  otherUnit: variant.otherUnit ? String(variant.otherUnit).trim() : '',
  weight: safeNumber(variant.weight, 0),
  listPrice: safeNumber(variant.listPrice, 0),
  discount: safeNumber(variant.discount, 0),
  profit: safeNumber(variant.profit, 0),
  gst: safeNumber(variant.gst, 18),
  finalPrice: safeNumber(variant.finalPrice, 0)
});

// ==================== BRAND FUNCTIONS ====================

exports.addBrand = async (req, res) => {
  try {
    let brandImage = "";
    if (req.file) brandImage = await processImage(req.file.path);
    const brand = await Brand.create({ brandName: req.body.brandName, brandImage });
    res.json(brand);
  } catch (error) { res.status(500).json({ error: error.message }); }
};

exports.updateBrand = async (req, res) => {
  try {
    const brand = await Brand.findById(req.params.brandId);
    if (!brand) return res.status(404).json({ error: 'Brand not found' });
    const updateData = { brandName: req.body.brandName };
    if (req.file) {
      if (brand.brandImage) await deleteImage(brand.brandImage);
      updateData.brandImage = await processImage(req.file.path);
    }
    const updatedBrand = await Brand.findByIdAndUpdate(req.params.brandId, updateData, { new: true });
    res.json(updatedBrand);
  } catch (error) { res.status(500).json({ error: error.message }); }
};

exports.deleteBrand = async (req, res) => {
  try {
    const brand = await Brand.findById(req.params.brandId);
    if (!brand) return res.status(404).json({ error: 'Brand not found' });
    if (brand.brandImage) await deleteImage(brand.brandImage);
    for (const category of brand.categories) {
      if (category.categoryImage) await deleteImage(category.categoryImage);
      for (const sub of category.subCategories)
        if (sub.subCategoryImage) await deleteImage(sub.subCategoryImage);
    }
    for (const product of brand.products) {
      if (product.images) for (const img of product.images) await deleteImage(img);
      if (product.catalog) await deleteImage(product.catalog);
    }
    await Brand.findByIdAndDelete(req.params.brandId);
    res.json({ message: "Brand deleted successfully" });
  } catch (error) { res.status(500).json({ error: error.message }); }
};

exports.getBrands = async (req, res) => {
  try { res.json(await Brand.find().sort({ createdAt: -1 })); }
  catch (error) { res.status(500).json({ error: error.message }); }
};

exports.getBrand = async (req, res) => {
  try {
    const brand = await Brand.findById(req.params.brandId);
    if (!brand) return res.status(404).json({ error: 'Brand not found' });
    res.json(brand);
  } catch (error) { res.status(500).json({ error: error.message }); }
};

// ==================== CATEGORY FUNCTIONS ====================

exports.addCategory = async (req, res) => {
  try {
    let categoryImage = "";
    if (req.file) categoryImage = await processImage(req.file.path);
    const brand = await Brand.findById(req.params.brandId);
    if (!brand) return res.status(404).json({ error: 'Brand not found' });
    brand.categories.push({ categoryName: req.body.categoryName, categoryImage });
    await brand.save();
    res.json(brand);
  } catch (error) { res.status(500).json({ error: error.message }); }
};

exports.updateCategory = async (req, res) => {
  try {
    const brand = await Brand.findById(req.params.brandId);
    if (!brand) return res.status(404).json({ error: 'Brand not found' });
    const category = brand.categories.id(req.params.categoryId);
    if (!category) return res.status(404).json({ error: 'Category not found' });
    if (req.body.categoryName) category.categoryName = req.body.categoryName;
    if (req.file) {
      if (category.categoryImage) await deleteImage(category.categoryImage);
      category.categoryImage = await processImage(req.file.path);
    }
    await brand.save();
    res.json(brand);
  } catch (error) { res.status(500).json({ error: error.message }); }
};

exports.deleteCategory = async (req, res) => {
  try {
    const brand = await Brand.findById(req.params.brandId);
    if (!brand) return res.status(404).json({ error: 'Brand not found' });
    const category = brand.categories.id(req.params.categoryId);
    if (!category) return res.status(404).json({ error: 'Category not found' });
    if (category.categoryImage) await deleteImage(category.categoryImage);
    for (const sub of category.subCategories)
      if (sub.subCategoryImage) await deleteImage(sub.subCategoryImage);
    brand.categories = brand.categories.filter(c => c._id.toString() !== req.params.categoryId);
    await brand.save();
    res.json({ message: "Category deleted successfully" });
  } catch (error) { res.status(500).json({ error: error.message }); }
};

// ==================== SUB CATEGORY FUNCTIONS ====================

exports.addSubCategory = async (req, res) => {
  try {
    let subCategoryImage = "";
    if (req.file) subCategoryImage = await processImage(req.file.path);
    const brand = await Brand.findById(req.params.brandId);
    if (!brand) return res.status(404).json({ error: 'Brand not found' });
    const category = brand.categories.id(req.params.categoryId);
    if (!category) return res.status(404).json({ error: 'Category not found' });
    category.subCategories.push({ subCategoryName: req.body.subCategoryName, subCategoryImage });
    await brand.save();
    res.json(brand);
  } catch (error) { res.status(500).json({ error: error.message }); }
};

exports.updateSubCategory = async (req, res) => {
  try {
    const brand = await Brand.findById(req.params.brandId);
    if (!brand) return res.status(404).json({ error: 'Brand not found' });
    const category = brand.categories.id(req.params.categoryId);
    if (!category) return res.status(404).json({ error: 'Category not found' });
    const sub = category.subCategories.id(req.params.subCategoryId);
    if (!sub) return res.status(404).json({ error: 'Sub-category not found' });
    if (req.body.subCategoryName) sub.subCategoryName = req.body.subCategoryName;
    if (req.file) {
      if (sub.subCategoryImage) await deleteImage(sub.subCategoryImage);
      sub.subCategoryImage = await processImage(req.file.path);
    }
    await brand.save();
    res.json(brand);
  } catch (error) { res.status(500).json({ error: error.message }); }
};

exports.deleteSubCategory = async (req, res) => {
  try {
    const brand = await Brand.findById(req.params.brandId);
    if (!brand) return res.status(404).json({ error: 'Brand not found' });
    const category = brand.categories.id(req.params.categoryId);
    if (!category) return res.status(404).json({ error: 'Category not found' });
    const sub = category.subCategories.id(req.params.subCategoryId);
    if (sub && sub.subCategoryImage) await deleteImage(sub.subCategoryImage);
    category.subCategories = category.subCategories.filter(s => s._id.toString() !== req.params.subCategoryId);
    await brand.save();
    res.json({ message: "Sub Category deleted successfully" });
  } catch (error) { res.status(500).json({ error: error.message }); }
};

// ==================== PRODUCT FUNCTIONS ====================

exports.addProduct = async (req, res) => {
  try {
    console.log('=== addProduct HIT ===');
  console.log('secondaryThreshold:', req.body.secondaryThreshold);
  console.log('tertiaryThreshold:', req.body.tertiaryThreshold);
    const brand = await Brand.findById(req.body.brandId);
    if (!brand) return res.status(404).json({ error: 'Brand not found' });
    const category = brand.categories.id(req.body.categoryId);
    if (!category) return res.status(404).json({ error: 'Category not found' });
    const subCategory = category.subCategories.id(req.body.subCategoryId);
    if (!subCategory) return res.status(404).json({ error: 'Sub-category not found' });

    let variants = [];
    try {
      const parsed = JSON.parse(req.body.variants);
      if (!Array.isArray(parsed)) return res.status(400).json({ error: 'Variants must be an array' });
      variants = parsed.map(sanitizeVariant);
      for (let i = 0; i < variants.length; i++) {
        const v = variants[i];
        if (!v.name) return res.status(400).json({ error: `Variant ${i + 1}: Name required` });
        if (v.listPrice < 0) return res.status(400).json({ error: `Variant "${v.name}": List Price invalid` });
      }
    } catch (e) { return res.status(400).json({ error: `Invalid variants JSON: ${e.message}` }); }

    const processedImages = [];
    if (req.files && req.files.images)
      for (const file of req.files.images) processedImages.push(await processImage(file.path));

    let catalogPath = null;
    if (req.files && req.files.catalog && req.files.catalog[0]) {
      const f = req.files.catalog[0];
      const fname = `${Date.now()}-${f.originalname}`;
      catalogPath = `uploads/${fname}`;
      await fs.rename(f.path, path.join('uploads', fname));
    }

    const secondaryThreshold = parseThreshold(req.body.secondaryThreshold);
    const tertiaryThreshold  = parseThreshold(req.body.tertiaryThreshold);

    console.log('[addProduct] thresholds to save:', { secondaryThreshold, tertiaryThreshold });

    // Build the new product object with a fresh ObjectId
    const mongoose = require('mongoose');
    const newProductId = new mongoose.Types.ObjectId();

    const newProduct = {
      _id: newProductId,
      access: req.body.access,
      brandId: req.body.brandId,
      brandName: brand.brandName,
      categoryId: req.body.categoryId,
      categoryName: category.categoryName,
      subCategoryId: req.body.subCategoryId,
      subCategoryName: subCategory.subCategoryName,
      productName: req.body.productName,
      description: req.body.description || '',
      images: processedImages,
      catalog: catalogPath,
      videoLink: req.body.videoLink || '',
      enquiry: req.body.enquiry === 'true',
      hsnCode: req.body.hsnCode || '',
      variants,
      secondaryThreshold: secondaryThreshold,
      tertiaryThreshold: tertiaryThreshold,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Use $push with $set to bypass Mongoose subdoc Mixed-type issues
    await Brand.updateOne(
      { _id: req.body.brandId },
      { $push: { products: newProduct } }
    );

    console.log('[addProduct] saved product with thresholds:', {
      secondaryThreshold: newProduct.secondaryThreshold,
      tertiaryThreshold: newProduct.tertiaryThreshold
    });

    res.json({ message: 'Product added successfully', product: newProduct });
  } catch (error) {
    console.error('[addProduct] Error:', error.message);
    res.status(500).json({ error: error.message || 'Error adding product' });
  }
};

exports.getAllProducts = async (req, res) => {
  try {
    const brands = await Brand.find();
    const allProducts = [];
    brands.forEach(brand => {
      brand.products.forEach(product => {
        const obj = product.toObject();
        allProducts.push({
          ...obj,
          _id: product._id,
          brandId: brand._id,
          secondaryThreshold: obj.secondaryThreshold ?? null,
          tertiaryThreshold:  obj.tertiaryThreshold  ?? null,
        });
      });
    });
    res.json(allProducts);
  } catch (error) { res.status(500).json({ error: error.message }); }
};

exports.getProductsByBrand = async (req, res) => {
  try {
    const brand = await Brand.findById(req.params.brandId);
    if (!brand) return res.status(404).json({ error: 'Brand not found' });
    res.json(brand.products);
  } catch (error) { res.status(500).json({ error: error.message }); }
};

exports.getProductsByCategory = async (req, res) => {
  try {
    const brand = await Brand.findById(req.params.brandId);
    if (!brand) return res.status(404).json({ error: 'Brand not found' });
    res.json(brand.products.filter(p => p.categoryId.toString() === req.params.categoryId));
  } catch (error) { res.status(500).json({ error: error.message }); }
};

exports.getProductsBySubCategory = async (req, res) => {
  try {
    const brand = await Brand.findById(req.params.brandId);
    if (!brand) return res.status(404).json({ error: 'Brand not found' });
    res.json(brand.products.filter(p => p.subCategoryId.toString() === req.params.subCategoryId));
  } catch (error) { res.status(500).json({ error: error.message }); }
};

exports.getProduct = async (req, res) => {
  try {
    const brand = await Brand.findById(req.params.brandId);
    if (!brand) return res.status(404).json({ error: 'Brand not found' });
    const product = brand.products.id(req.params.productId);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json(product);
  } catch (error) { res.status(500).json({ error: error.message }); }
};

exports.updateProduct = async (req, res) => {
  try {
    console.log('📦 secondaryThreshold raw:', req.body.secondaryThreshold);
    console.log('📦 tertiaryThreshold raw:', req.body.tertiaryThreshold);

    const brand = await Brand.findById(req.params.brandId);
    if (!brand) return res.status(404).json({ error: 'Brand not found' });
    const product = brand.products.id(req.params.productId);
    if (!product) return res.status(404).json({ error: 'Product not found' });

    const secondaryThreshold = parseThreshold(req.body.secondaryThreshold);
    const tertiaryThreshold  = parseThreshold(req.body.tertiaryThreshold);

    console.log('[updateProduct] parsed thresholds:', { secondaryThreshold, tertiaryThreshold });

    // Handle variants
    let variants = product.variants;
    if (req.body.variants) {
      try {
        const parsed = JSON.parse(req.body.variants);
        if (!Array.isArray(parsed)) return res.status(400).json({ error: 'Variants must be an array' });
        const sanitized = parsed.map(sanitizeVariant);
        for (let i = 0; i < sanitized.length; i++) {
          if (!sanitized[i].name) return res.status(400).json({ error: `Variant ${i + 1}: Name required` });
          if (sanitized[i].listPrice < 0) return res.status(400).json({ error: `Variant "${sanitized[i].name}": List Price invalid` });
        }
        variants = sanitized;
      } catch (e) { return res.status(400).json({ error: `Invalid variants JSON: ${e.message}` }); }
    }

    // Handle images
    let images = product.images || [];
    if (req.files && req.files.images && req.files.images.length > 0) {
      const newImages = [];
      for (const file of req.files.images) newImages.push(await processImage(file.path));
      if (product.images) for (const old of product.images) await deleteImage(old);
      images = newImages;
    } else if (req.body.existingImages) {
      try {
        const kept = JSON.parse(req.body.existingImages);
        if (product.images) for (const old of product.images) if (!kept.includes(old)) await deleteImage(old);
        images = kept;
      } catch (_) {}
    }

    // Handle catalog
    let catalogPath = product.catalog;
    if (req.files && req.files.catalog && req.files.catalog[0]) {
      if (product.catalog) await deleteImage(product.catalog);
      const f = req.files.catalog[0];
      const fname = `${Date.now()}-${f.originalname}`;
      catalogPath = `uploads/${fname}`;
      await fs.rename(f.path, path.join('uploads', fname));
    } else if (req.body.existingCatalog) {
      catalogPath = req.body.existingCatalog;
    }

    // Use $set with positional operator — this DIRECTLY writes to MongoDB,
    // bypassing ALL Mongoose subdocument/Mixed type issues
    await Brand.updateOne(
      { _id: req.params.brandId, 'products._id': req.params.productId },
      {
        $set: {
          'products.$.access':              req.body.access || product.access,
          'products.$.productName':         req.body.productName || product.productName,
          'products.$.description':         req.body.description !== undefined ? req.body.description : product.description,
          'products.$.videoLink':           req.body.videoLink !== undefined ? req.body.videoLink : product.videoLink,
          'products.$.enquiry':             req.body.enquiry !== undefined ? req.body.enquiry === 'true' : product.enquiry,
          'products.$.hsnCode':             req.body.hsnCode !== undefined ? req.body.hsnCode : product.hsnCode,
          'products.$.variants':            variants,
          'products.$.images':              images,
          'products.$.catalog':             catalogPath,
          'products.$.secondaryThreshold':  secondaryThreshold,   // ← direct $set, no Mongoose casting
          'products.$.tertiaryThreshold':   tertiaryThreshold,    // ← direct $set, no Mongoose casting
          'products.$.updatedAt':           new Date(),
        }
      }
    );

    console.log('[updateProduct] $set done with thresholds:', { secondaryThreshold, tertiaryThreshold });

    // Fetch the updated product to return it
    const updatedBrand = await Brand.findById(req.params.brandId);
    const updatedProduct = updatedBrand.products.id(req.params.productId);
    const saved = updatedProduct.toObject();

    console.log('[updateProduct] verified from DB:', {
      secondaryThreshold: saved.secondaryThreshold,
      tertiaryThreshold: saved.tertiaryThreshold
    });

    res.json({ message: 'Product updated successfully', product: saved });
  } catch (error) {
    console.error('[updateProduct] Error:', error.message);
    res.status(500).json({ error: error.message || 'Error updating product' });
  }
};

exports.deleteProduct = async (req, res) => {
  try {
    const brand = await Brand.findById(req.params.brandId);
    if (!brand) return res.status(404).json({ error: 'Brand not found' });
    const product = brand.products.id(req.params.productId);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    if (product.images) for (const img of product.images) await deleteImage(img);
    if (product.catalog) await deleteImage(product.catalog);
    brand.products = brand.products.filter(p => p._id.toString() !== req.params.productId);
    await brand.save();
    res.json({ message: 'Product deleted successfully' });
  } catch (error) { res.status(500).json({ error: error.message }); }
};

// ==================== BRAND STATUS ====================

exports.updateBrandStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!['publish', 'hold'].includes(status)) return res.status(400).json({ error: 'Invalid status' });
    const brand = await Brand.findById(req.params.brandId);
    if (!brand) return res.status(404).json({ error: 'Brand not found' });
    brand.status = status;
    await brand.save();
    res.json({ message: `Brand ${status === 'publish' ? 'published' : 'put on hold'} successfully`, brand });
  } catch (error) { res.status(500).json({ error: error.message }); }
};

exports.getPublishedProducts = async (req, res) => {
  try {
    const brands = await Brand.find({ status: 'publish' });
    const products = [];
    brands.forEach(brand => {
      brand.products.forEach(product => {
        const obj = product.toObject();
        products.push({
          ...obj,
          _id: product._id,
          brandId: brand._id,
          secondaryThreshold: obj.secondaryThreshold ?? null,
          tertiaryThreshold:  obj.tertiaryThreshold  ?? null,
        });
      });
    });
    res.json(products);
  } catch (error) { res.status(500).json({ error: error.message }); }
};

exports.searchProducts = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || String(q).trim().length < 2) return res.status(400).json({ error: 'Search query must be at least 2 characters' });
    const searchTerm = String(q).trim().toLowerCase();
    const brands = await Brand.find({ status: 'publish' });
    const results = [];
    brands.forEach(brand => {
      brand.products.forEach(product => {
        const matches =
          product.productName.toLowerCase().includes(searchTerm) ||
          product.categoryName?.toLowerCase().includes(searchTerm) ||
          product.subCategoryName?.toLowerCase().includes(searchTerm) ||
          product.description?.toLowerCase().includes(searchTerm) ||
          brand.brandName.toLowerCase().includes(searchTerm);
        if (matches) {
          const obj = product.toObject();
          results.push({ ...obj, _id: product._id, brandId: brand._id, secondaryThreshold: obj.secondaryThreshold ?? null, tertiaryThreshold: obj.tertiaryThreshold ?? null });
        }
      });
    });
    res.json(results);
  } catch (error) { res.status(500).json({ error: error.message }); }
};