
// const Brand = require("../models/brandsmodel");
// const sharp = require('sharp');
// const path = require('path');
// const fs = require('fs').promises;

// // Image processing function - converts to WebP and compresses
// async function processImage(filePath) {
//   try {
//     const webpFilename = `${Date.now()}-${Math.random().toString(36).substring(7)}.webp`;
//     const outputPath = path.join('uploads', webpFilename);
    
//     // Ensure uploads directory exists
//     await fs.mkdir('uploads', { recursive: true });
    
//     // Process image: resize, compress, and convert to WebP
//     await sharp(filePath)
//       .resize(800, 800, {
//         fit: 'inside',
//         withoutEnlargement: true
//       })
//       .webp({
//         quality: 80, // Adjust quality (0-100)
//         effort: 6    // Compression effort (0-6, higher = smaller file)
//       })
//       .toFile(outputPath);
    
//     // Delete original uploaded file
//     await fs.unlink(filePath);
    
//     return outputPath;
//   } catch (error) {
//     console.error('Error processing image:', error);
//     throw error;
//   }
// }

// // Delete old image file
// async function deleteImage(imagePath) {
//   if (!imagePath) return;
//   try {
//     await fs.unlink(imagePath);
//     console.log('Deleted old image:', imagePath);
//   } catch (error) {
//     console.error('Error deleting image:', error);
//   }
// }

// // ==================== ADD FUNCTIONS ====================

// // ADD BRAND
// exports.addBrand = async (req, res) => {
//   try {
//     let brandImage = "";
    
//     if (req.file) {
//       brandImage = await processImage(req.file.path);
//     }
    
//     const brand = await Brand.create({
//       brandName: req.body.brandName,
//       brandImage: brandImage,
//     });
    
//     res.json(brand);
//   } catch (error) {
//     console.error('Error adding brand:', error);
//     res.status(500).json({ error: error.message });
//   }
// };

// // ADD CATEGORY
// exports.addCategory = async (req, res) => {
//   try {
//     let categoryImage = "";
    
//     if (req.file) {
//       categoryImage = await processImage(req.file.path);
//     }
    
//     const brand = await Brand.findById(req.params.brandId);
    
//     if (!brand) {
//       return res.status(404).json({ error: 'Brand not found' });
//     }
    
//     brand.categories.push({
//       categoryName: req.body.categoryName,
//       categoryImage: categoryImage,
//     });
    
//     await brand.save();
//     res.json(brand);
//   } catch (error) {
//     console.error('Error adding category:', error);
//     res.status(500).json({ error: error.message });
//   }
// };

// // ADD SUB CATEGORY
// exports.addSubCategory = async (req, res) => {
//   try {
//     let subCategoryImage = "";
    
//     if (req.file) {
//       subCategoryImage = await processImage(req.file.path);
//     }
    
//     const brand = await Brand.findById(req.params.brandId);
    
//     if (!brand) {
//       return res.status(404).json({ error: 'Brand not found' });
//     }
    
//     const category = brand.categories.id(req.params.categoryId);
    
//     if (!category) {
//       return res.status(404).json({ error: 'Category not found' });
//     }

//     category.subCategories.push({
//       subCategoryName: req.body.subCategoryName,
//       subCategoryImage: subCategoryImage,
//     });

//     await brand.save();
//     res.json(brand);
//   } catch (error) {
//     console.error('Error adding sub-category:', error);
//     res.status(500).json({ error: error.message });
//   }
// };

// // ==================== UPDATE FUNCTIONS ====================

// // UPDATE BRAND
// exports.updateBrand = async (req, res) => {
//   try {
//     const brand = await Brand.findById(req.params.brandId);
    
//     if (!brand) {
//       return res.status(404).json({ error: 'Brand not found' });
//     }
    
//     const updateData = {
//       brandName: req.body.brandName
//     };
    
//     if (req.file) {
//       // Delete old image if exists
//       if (brand.brandImage) {
//         await deleteImage(brand.brandImage);
//       }
      
//       // Process and save new image
//       updateData.brandImage = await processImage(req.file.path);
//     }
    
//     const updatedBrand = await Brand.findByIdAndUpdate(
//       req.params.brandId,
//       updateData,
//       { new: true }
//     );
    
//     res.json(updatedBrand);
//   } catch (error) {
//     console.error('Error updating brand:', error);
//     res.status(500).json({ error: error.message });
//   }
// };

// // UPDATE CATEGORY
// exports.updateCategory = async (req, res) => {
//   try {
//     const brand = await Brand.findById(req.params.brandId);
    
//     if (!brand) {
//       return res.status(404).json({ error: 'Brand not found' });
//     }
    
//     const category = brand.categories.id(req.params.categoryId);
    
//     if (!category) {
//       return res.status(404).json({ error: 'Category not found' });
//     }
    
//     if (req.body.categoryName) {
//       category.categoryName = req.body.categoryName;
//     }
    
//     if (req.file) {
//       // Delete old image if exists
//       if (category.categoryImage) {
//         await deleteImage(category.categoryImage);
//       }
      
//       // Process and save new image
//       category.categoryImage = await processImage(req.file.path);
//     }
    
//     await brand.save();
//     res.json(brand);
//   } catch (error) {
//     console.error('Error updating category:', error);
//     res.status(500).json({ error: error.message });
//   }
// };

// // UPDATE SUB CATEGORY
// exports.updateSubCategory = async (req, res) => {
//   try {
//     const brand = await Brand.findById(req.params.brandId);
    
//     if (!brand) {
//       return res.status(404).json({ error: 'Brand not found' });
//     }
    
//     const category = brand.categories.id(req.params.categoryId);
    
//     if (!category) {
//       return res.status(404).json({ error: 'Category not found' });
//     }
    
//     const subCategory = category.subCategories.id(req.params.subCategoryId);
    
//     if (!subCategory) {
//       return res.status(404).json({ error: 'Sub-category not found' });
//     }
    
//     if (req.body.subCategoryName) {
//       subCategory.subCategoryName = req.body.subCategoryName;
//     }
    
//     if (req.file) {
//       // Delete old image if exists
//       if (subCategory.subCategoryImage) {
//         await deleteImage(subCategory.subCategoryImage);
//       }
      
//       // Process and save new image
//       subCategory.subCategoryImage = await processImage(req.file.path);
//     }
    
//     await brand.save();
//     res.json(brand);
//   } catch (error) {
//     console.error('Error updating sub-category:', error);
//     res.status(500).json({ error: error.message });
//   }
// };

// // ==================== DELETE FUNCTIONS ====================

// // DELETE BRAND
// exports.deleteBrand = async (req, res) => {
//   try {
//     const brand = await Brand.findById(req.params.brandId);
    
//     if (!brand) {
//       return res.status(404).json({ error: 'Brand not found' });
//     }
    
//     // Delete brand image
//     if (brand.brandImage) {
//       await deleteImage(brand.brandImage);
//     }
    
//     // Delete all category and subcategory images
//     for (const category of brand.categories) {
//       if (category.categoryImage) {
//         await deleteImage(category.categoryImage);
//       }
      
//       for (const subCategory of category.subCategories) {
//         if (subCategory.subCategoryImage) {
//           await deleteImage(subCategory.subCategoryImage);
//         }
//       }
//     }
    
//     await Brand.findByIdAndDelete(req.params.brandId);
//     res.json({ message: "Brand deleted successfully" });
//   } catch (error) {
//     console.error('Error deleting brand:', error);
//     res.status(500).json({ error: error.message });
//   }
// };

// // DELETE CATEGORY
// exports.deleteCategory = async (req, res) => {
//   try {
//     const brand = await Brand.findById(req.params.brandId);
    
//     if (!brand) {
//       return res.status(404).json({ error: 'Brand not found' });
//     }
    
//     const category = brand.categories.id(req.params.categoryId);
    
//     if (!category) {
//       return res.status(404).json({ error: 'Category not found' });
//     }
    
//     // Delete category image
//     if (category.categoryImage) {
//       await deleteImage(category.categoryImage);
//     }
    
//     // Delete all subcategory images
//     for (const subCategory of category.subCategories) {
//       if (subCategory.subCategoryImage) {
//         await deleteImage(subCategory.subCategoryImage);
//       }
//     }
    
//     brand.categories = brand.categories.filter(
//       c => c._id.toString() !== req.params.categoryId
//     );
    
//     await brand.save();
//     res.json({ message: "Category deleted successfully" });
//   } catch (error) {
//     console.error('Error deleting category:', error);
//     res.status(500).json({ error: error.message });
//   }
// };

// // DELETE SUB CATEGORY
// exports.deleteSubCategory = async (req, res) => {
//   try {
//     const brand = await Brand.findById(req.params.brandId);
    
//     if (!brand) {
//       return res.status(404).json({ error: 'Brand not found' });
//     }
    
//     const category = brand.categories.id(req.params.categoryId);
    
//     if (!category) {
//       return res.status(404).json({ error: 'Category not found' });
//     }
    
//     const subCategory = category.subCategories.id(req.params.subCategoryId);
    
//     // Delete subcategory image
//     if (subCategory && subCategory.subCategoryImage) {
//       await deleteImage(subCategory.subCategoryImage);
//     }
    
//     category.subCategories = category.subCategories.filter(
//       s => s._id.toString() !== req.params.subCategoryId
//     );
    
//     await brand.save();
//     res.json({ message: "Sub Category deleted successfully" });
//   } catch (error) {
//     console.error('Error deleting sub-category:', error);
//     res.status(500).json({ error: error.message });
//   }
// };

// // ==================== GET FUNCTIONS ====================

// // GET ALL BRANDS
// exports.getBrands = async (req, res) => {
//   try {
//     const data = await Brand.find().sort({ createdAt: -1 });
//     res.json(data);
//   } catch (error) {
//     console.error('Error fetching brands:', error);
//     res.status(500).json({ error: error.message });
//   }
// };

// // GET SINGLE BRAND
// exports.getBrand = async (req, res) => {
//   try {
//     const brand = await Brand.findById(req.params.brandId);
    
//     if (!brand) {
//       return res.status(404).json({ error: 'Brand not found' });
//     }
    
//     res.json(brand);
//   } catch (error) {
//     console.error('Error fetching brand:', error);
//     res.status(500).json({ error: error.message });
//   }
// };


const Brand = require("../models/brandsmodel");
const sharp = require('sharp');
const path = require('path');
const fs = require('fs').promises;

// Image processing function - converts to WebP and compresses
async function processImage(filePath) {
  try {
    const webpFilename = `${Date.now()}-${Math.random().toString(36).substring(7)}.webp`;
    const outputPath = path.join('uploads', webpFilename);
    
    // Ensure uploads directory exists
    await fs.mkdir('uploads', { recursive: true });
    
    // Process image: resize, compress, and convert to WebP
    await sharp(filePath)
      .resize(800, 800, {
        fit: 'inside',
        withoutEnlargement: true
      })
      .webp({
        quality: 80,
        effort: 6
      })
      .toFile(outputPath);
    
    // Delete original uploaded file
    await fs.unlink(filePath);
    
    return outputPath;
  } catch (error) {
    console.error('Error processing image:', error);
    throw error;
  }
}

// Delete old image file
async function deleteImage(imagePath) {
  if (!imagePath) return;
  try {
    await fs.unlink(imagePath);
    console.log('Deleted old image:', imagePath);
  } catch (error) {
    console.error('Error deleting image:', error);
  }
}

// ==================== BRAND FUNCTIONS ====================

// ADD BRAND
exports.addBrand = async (req, res) => {
  try {
    let brandImage = "";
    
    if (req.file) {
      brandImage = await processImage(req.file.path);
    }
    
    const brand = await Brand.create({
      brandName: req.body.brandName,
      brandImage: brandImage,
    });
    
    res.json(brand);
  } catch (error) {
    console.error('Error adding brand:', error);
    res.status(500).json({ error: error.message });
  }
};

// UPDATE BRAND
exports.updateBrand = async (req, res) => {
  try {
    const brand = await Brand.findById(req.params.brandId);
    
    if (!brand) {
      return res.status(404).json({ error: 'Brand not found' });
    }
    
    const updateData = {
      brandName: req.body.brandName
    };
    
    if (req.file) {
      if (brand.brandImage) {
        await deleteImage(brand.brandImage);
      }
      updateData.brandImage = await processImage(req.file.path);
    }
    
    const updatedBrand = await Brand.findByIdAndUpdate(
      req.params.brandId,
      updateData,
      { new: true }
    );
    
    res.json(updatedBrand);
  } catch (error) {
    console.error('Error updating brand:', error);
    res.status(500).json({ error: error.message });
  }
};

// DELETE BRAND
exports.deleteBrand = async (req, res) => {
  try {
    const brand = await Brand.findById(req.params.brandId);
    
    if (!brand) {
      return res.status(404).json({ error: 'Brand not found' });
    }
    
    if (brand.brandImage) {
      await deleteImage(brand.brandImage);
    }
    
    for (const category of brand.categories) {
      if (category.categoryImage) {
        await deleteImage(category.categoryImage);
      }
      
      for (const subCategory of category.subCategories) {
        if (subCategory.subCategoryImage) {
          await deleteImage(subCategory.subCategoryImage);
        }
      }
    }
    
    // Delete all product images
    for (const product of brand.products) {
      if (product.images && product.images.length > 0) {
        for (const image of product.images) {
          await deleteImage(image);
        }
      }
      if (product.catalog) {
        await deleteImage(product.catalog);
      }
    }
    
    await Brand.findByIdAndDelete(req.params.brandId);
    res.json({ message: "Brand deleted successfully" });
  } catch (error) {
    console.error('Error deleting brand:', error);
    res.status(500).json({ error: error.message });
  }
};

// GET ALL BRANDS
exports.getBrands = async (req, res) => {
  try {
    const data = await Brand.find().sort({ createdAt: -1 });
    res.json(data);
  } catch (error) {
    console.error('Error fetching brands:', error);
    res.status(500).json({ error: error.message });
  }
};

// GET SINGLE BRAND
exports.getBrand = async (req, res) => {
  try {
    const brand = await Brand.findById(req.params.brandId);
    
    if (!brand) {
      return res.status(404).json({ error: 'Brand not found' });
    }
    
    res.json(brand);
  } catch (error) {
    console.error('Error fetching brand:', error);
    res.status(500).json({ error: error.message });
  }
};

// ==================== CATEGORY FUNCTIONS ====================

// ADD CATEGORY
exports.addCategory = async (req, res) => {
  try {
    let categoryImage = "";
    
    if (req.file) {
      categoryImage = await processImage(req.file.path);
    }
    
    const brand = await Brand.findById(req.params.brandId);
    
    if (!brand) {
      return res.status(404).json({ error: 'Brand not found' });
    }
    
    brand.categories.push({
      categoryName: req.body.categoryName,
      categoryImage: categoryImage,
    });
    
    await brand.save();
    res.json(brand);
  } catch (error) {
    console.error('Error adding category:', error);
    res.status(500).json({ error: error.message });
  }
};

// UPDATE CATEGORY
exports.updateCategory = async (req, res) => {
  try {
    const brand = await Brand.findById(req.params.brandId);
    
    if (!brand) {
      return res.status(404).json({ error: 'Brand not found' });
    }
    
    const category = brand.categories.id(req.params.categoryId);
    
    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }
    
    if (req.body.categoryName) {
      category.categoryName = req.body.categoryName;
    }
    
    if (req.file) {
      if (category.categoryImage) {
        await deleteImage(category.categoryImage);
      }
      category.categoryImage = await processImage(req.file.path);
    }
    
    await brand.save();
    res.json(brand);
  } catch (error) {
    console.error('Error updating category:', error);
    res.status(500).json({ error: error.message });
  }
};

// DELETE CATEGORY
exports.deleteCategory = async (req, res) => {
  try {
    const brand = await Brand.findById(req.params.brandId);
    
    if (!brand) {
      return res.status(404).json({ error: 'Brand not found' });
    }
    
    const category = brand.categories.id(req.params.categoryId);
    
    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }
    
    if (category.categoryImage) {
      await deleteImage(category.categoryImage);
    }
    
    for (const subCategory of category.subCategories) {
      if (subCategory.subCategoryImage) {
        await deleteImage(subCategory.subCategoryImage);
      }
    }
    
    brand.categories = brand.categories.filter(
      c => c._id.toString() !== req.params.categoryId
    );
    
    await brand.save();
    res.json({ message: "Category deleted successfully" });
  } catch (error) {
    console.error('Error deleting category:', error);
    res.status(500).json({ error: error.message });
  }
};

// ==================== SUB CATEGORY FUNCTIONS ====================

// ADD SUB CATEGORY
exports.addSubCategory = async (req, res) => {
  try {
    let subCategoryImage = "";
    
    if (req.file) {
      subCategoryImage = await processImage(req.file.path);
    }
    
    const brand = await Brand.findById(req.params.brandId);
    
    if (!brand) {
      return res.status(404).json({ error: 'Brand not found' });
    }
    
    const category = brand.categories.id(req.params.categoryId);
    
    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }

    category.subCategories.push({
      subCategoryName: req.body.subCategoryName,
      subCategoryImage: subCategoryImage,
    });

    await brand.save();
    res.json(brand);
  } catch (error) {
    console.error('Error adding sub-category:', error);
    res.status(500).json({ error: error.message });
  }
};

// UPDATE SUB CATEGORY
exports.updateSubCategory = async (req, res) => {
  try {
    const brand = await Brand.findById(req.params.brandId);
    
    if (!brand) {
      return res.status(404).json({ error: 'Brand not found' });
    }
    
    const category = brand.categories.id(req.params.categoryId);
    
    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }
    
    const subCategory = category.subCategories.id(req.params.subCategoryId);
    
    if (!subCategory) {
      return res.status(404).json({ error: 'Sub-category not found' });
    }
    
    if (req.body.subCategoryName) {
      subCategory.subCategoryName = req.body.subCategoryName;
    }
    
    if (req.file) {
      if (subCategory.subCategoryImage) {
        await deleteImage(subCategory.subCategoryImage);
      }
      subCategory.subCategoryImage = await processImage(req.file.path);
    }
    
    await brand.save();
    res.json(brand);
  } catch (error) {
    console.error('Error updating sub-category:', error);
    res.status(500).json({ error: error.message });
  }
};

// DELETE SUB CATEGORY
exports.deleteSubCategory = async (req, res) => {
  try {
    const brand = await Brand.findById(req.params.brandId);
    
    if (!brand) {
      return res.status(404).json({ error: 'Brand not found' });
    }
    
    const category = brand.categories.id(req.params.categoryId);
    
    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }
    
    const subCategory = category.subCategories.id(req.params.subCategoryId);
    
    if (subCategory && subCategory.subCategoryImage) {
      await deleteImage(subCategory.subCategoryImage);
    }
    
    category.subCategories = category.subCategories.filter(
      s => s._id.toString() !== req.params.subCategoryId
    );
    
    await brand.save();
    res.json({ message: "Sub Category deleted successfully" });
  } catch (error) {
    console.error('Error deleting sub-category:', error);
    res.status(500).json({ error: error.message });
  }
};

// ==================== PRODUCT FUNCTIONS ====================

// ADD PRODUCT
exports.addProduct = async (req, res) => {
  try {
    const brand = await Brand.findById(req.body.brandId);
    
    if (!brand) {
      return res.status(404).json({ error: 'Brand not found' });
    }
    
    const category = brand.categories.id(req.body.categoryId);
    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }
    
    const subCategory = category.subCategories.id(req.body.subCategoryId);
    if (!subCategory) {
      return res.status(404).json({ error: 'Sub-category not found' });
    }
    
    // Process product images (convert to WebP)
    const processedImages = [];
    if (req.files && req.files.images) {
      for (const file of req.files.images) {
        const processedPath = await processImage(file.path);
        processedImages.push(processedPath);
      }
    }
    
    // Process catalog file if present
    let catalogPath = null;
    if (req.files && req.files.catalog && req.files.catalog[0]) {
      // For catalog, just move it without processing (PDF/DOC)
      const catalogFile = req.files.catalog[0];
      const catalogFilename = `${Date.now()}-${catalogFile.originalname}`;
      catalogPath = path.join('uploads', catalogFilename);
      await fs.rename(catalogFile.path, catalogPath);
    }
    
    // Parse variants from JSON string
    const variants = JSON.parse(req.body.variants);
    
    // Create product object
    const productData = {
      access: req.body.access,
      brandId: req.body.brandId,
      brandName: brand.brandName,
      categoryId: req.body.categoryId,
      categoryName: category.categoryName,
      subCategoryId: req.body.subCategoryId,
      subCategoryName: subCategory.subCategoryName,
      productName: req.body.productName,
      description: req.body.description,
      images: processedImages,
      catalog: catalogPath,
      videoLink: req.body.videoLink,
      enquiry: req.body.enquiry === 'true',
      hsnCode: req.body.hsnCode,
      variants: variants
    };
    
    // Add product to brand's products array
    brand.products.push(productData);
    await brand.save();
    
    res.json({ 
      message: 'Product added successfully', 
      product: brand.products[brand.products.length - 1] 
    });
  } catch (error) {
    console.error('Error adding product:', error);
    res.status(500).json({ error: error.message });
  }
};

// GET ALL PRODUCTS
exports.getAllProducts = async (req, res) => {
  try {
    const brands = await Brand.find();
    
    // Flatten all products from all brands
    const allProducts = [];
    brands.forEach(brand => {
      brand.products.forEach(product => {
        allProducts.push({
          ...product.toObject(),
          _id: product._id,
          brandId: brand._id
        });
      });
    });
    
    res.json(allProducts);
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ error: error.message });
  }
};

// GET PRODUCTS BY BRAND
exports.getProductsByBrand = async (req, res) => {
  try {
    const brand = await Brand.findById(req.params.brandId);
    
    if (!brand) {
      return res.status(404).json({ error: 'Brand not found' });
    }
    
    res.json(brand.products);
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ error: error.message });
  }
};

// GET PRODUCTS BY CATEGORY
exports.getProductsByCategory = async (req, res) => {
  try {
    const brand = await Brand.findById(req.params.brandId);
    
    if (!brand) {
      return res.status(404).json({ error: 'Brand not found' });
    }
    
    const categoryProducts = brand.products.filter(
      product => product.categoryId.toString() === req.params.categoryId
    );
    
    res.json(categoryProducts);
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ error: error.message });
  }
};

// GET PRODUCTS BY SUB-CATEGORY
exports.getProductsBySubCategory = async (req, res) => {
  try {
    const brand = await Brand.findById(req.params.brandId);
    
    if (!brand) {
      return res.status(404).json({ error: 'Brand not found' });
    }
    
    const subCategoryProducts = brand.products.filter(
      product => product.subCategoryId.toString() === req.params.subCategoryId
    );
    
    res.json(subCategoryProducts);
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ error: error.message });
  }
};

// GET SINGLE PRODUCT
exports.getProduct = async (req, res) => {
  try {
    const brand = await Brand.findById(req.params.brandId);
    
    if (!brand) {
      return res.status(404).json({ error: 'Brand not found' });
    }
    
    const product = brand.products.id(req.params.productId);
    
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    res.json(product);
  } catch (error) {
    console.error('Error fetching product:', error);
    res.status(500).json({ error: error.message });
  }
};

// UPDATE PRODUCT
exports.updateProduct = async (req, res) => {
  try {
    const brand = await Brand.findById(req.params.brandId);
    
    if (!brand) {
      return res.status(404).json({ error: 'Brand not found' });
    }
    
    const product = brand.products.id(req.params.productId);
    
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    // Update basic fields
    if (req.body.access) product.access = req.body.access;
    if (req.body.productName) product.productName = req.body.productName;
    if (req.body.description) product.description = req.body.description;
    if (req.body.videoLink) product.videoLink = req.body.videoLink;
    if (req.body.enquiry !== undefined) product.enquiry = req.body.enquiry === 'true';
    if (req.body.hsnCode) product.hsnCode = req.body.hsnCode;
    
    // Update variants if provided
    if (req.body.variants) {
      product.variants = JSON.parse(req.body.variants);
    }
    
    // Process new images if uploaded
    if (req.files && req.files.images) {
      const newImages = [];
      for (const file of req.files.images) {
        const processedPath = await processImage(file.path);
        newImages.push(processedPath);
      }
      
      // Delete old images
      if (product.images && product.images.length > 0) {
        for (const oldImage of product.images) {
          await deleteImage(oldImage);
        }
      }
      
      product.images = newImages;
    }
    
    // Update catalog if uploaded
    if (req.files && req.files.catalog && req.files.catalog[0]) {
      if (product.catalog) {
        await deleteImage(product.catalog);
      }
      
      const catalogFile = req.files.catalog[0];
      const catalogFilename = `${Date.now()}-${catalogFile.originalname}`;
      const catalogPath = path.join('uploads', catalogFilename);
      await fs.rename(catalogFile.path, catalogPath);
      product.catalog = catalogPath;
    }
    
    await brand.save();
    res.json({ message: 'Product updated successfully', product });
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({ error: error.message });
  }
};

// DELETE PRODUCT
exports.deleteProduct = async (req, res) => {
  try {
    const brand = await Brand.findById(req.params.brandId);
    
    if (!brand) {
      return res.status(404).json({ error: 'Brand not found' });
    }
    
    const product = brand.products.id(req.params.productId);
    
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    // Delete product images
    if (product.images && product.images.length > 0) {
      for (const image of product.images) {
        await deleteImage(image);
      }
    }
    
    // Delete catalog
    if (product.catalog) {
      await deleteImage(product.catalog);
    }
    
    // Remove product from array
    brand.products = brand.products.filter(
      p => p._id.toString() !== req.params.productId
    );
    
    await brand.save();
    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({ error: error.message });
  }
};