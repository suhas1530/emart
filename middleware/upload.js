

const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Create uploads directory if it doesn't exist
if (!fs.existsSync("uploads")) {
  fs.mkdirSync("uploads", { recursive: true });
}

// Create temp directory for temporary storage
if (!fs.existsSync("uploads/temp")) {
  fs.mkdirSync("uploads/temp", { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/temp/"); // Store temporarily before processing
  },
  filename: (req, file, cb) => {
    // Generate unique filename with original extension (will be converted to webp later)
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, "temp-" + uniqueSuffix + path.extname(file.originalname));
  },
});

// File filter to accept images for image fields and documents for catalog field
const fileFilter = (req, file, cb) => {
  const imagesRegex = /jpeg|jpg|png|gif|webp|bmp|tiff/;
  const docsRegex = /pdf|msword|vnd\.openxmlformats-officedocument\.wordprocessingml\.document|vnd\.ms-excel|vnd\.openxmlformats-officedocument\.spreadsheetml\.sheet/;

  const ext = path.extname(file.originalname).toLowerCase();
  const mimetype = (file.mimetype || '').toLowerCase();

  // Allow catalogs (pdf, doc, docx, xls, xlsx) on the 'catalog' field
  if (file.fieldname === 'catalog') {
    const allowedExt = /\.pdf|\.doc|\.docx|\.xls|\.xlsx/;
    if (allowedExt.test(ext) || docsRegex.test(mimetype)) {
      return cb(null, true);
    }
    return cb(new Error('Error: Only catalog files are allowed (pdf, doc, docx, xls, xlsx)'));
  }

  // For all other fields (images), accept image types
  const isImageExt = imagesRegex.test(ext);
  const isImageMime = imagesRegex.test(mimetype);
  if (isImageExt || isImageMime) {
    return cb(null, true);
  }

  cb(new Error('Error: Only image files are allowed for image fields (jpeg, jpg, png, gif, webp, bmp, tiff)'));
};

module.exports = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB max file size
  },
  fileFilter: fileFilter
});
