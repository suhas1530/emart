// const express = require("express");
// const mongoose = require("mongoose");
// const cors = require("cors");
// require("dotenv").config();

// const app = express();

// app.use(cors());
// app.use(express.json());
// app.use("/uploads", express.static("uploads"));

// // MongoDB connection from .env
// mongoose
//   .connect(process.env.MONGO_URI)
//   .then(() => console.log("MongoDB Connected"))
//   .catch(err => console.error(err));

// app.use("/api/brands", require("./routes/brandsroute"));

// const PORT = process.env.PORT || 4000;
// app.listen(PORT, () => console.log(`Server running on ${PORT}`));


const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();
const path = require("path");

// Import security middleware
const {
  quoteSubmissionLimiter,
  apiLimiter,
  adminOperationLimiter,
  sanitizeData,
  xssProtection,
  parameterPollutionPrevention,
  helmetProtection,
  validateVendorInput,
  trackIPSubmissions,
  errorHandler,
  corsOptions
} = require('./middleware/securityMiddleware');

const app = express();

// Security middleware
app.use(helmetProtection);
app.use(cors(corsOptions));
app.use(sanitizeData);
app.use(xssProtection);
app.use(parameterPollutionPrevention);

// Body parser with size limit
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Static files
app.use("/uploads", express.static("uploads"));

// MongoDB connection from .env
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch(err => console.error("MongoDB connection error:", err));

// ==================== Routes ====================

// API limiter for all routes
app.use('/api/', apiLimiter);

// Brands
app.use("/api/brands", require("./routes/brandsroute"));

// Advertisements
app.use("/api/ads", require("./routes/advertisementRoutes"));

// Banners
app.use("/api/banners", require("./routes/bannerRoutes"));

// Testimonials
app.use("/api/testimonials", require("./routes/testimonialRoutes"));

// Vendor Quotes - PUBLIC endpoints
app.post('/api/vendor/submit-quote', 
  trackIPSubmissions, 
  quoteSubmissionLimiter, 
  validateVendorInput, 
  require('./routes/vendorroutes')
);

app.get('/api/vendor/quotes/:itemId', require('./routes/vendorroutes'));
app.get('/api/vendor/product/:itemId', require('./routes/vendorroutes'));

// Vendor Quotes - ADMIN endpoints
app.use('/api/admin/vendor-quotes', 
  adminOperationLimiter,
  require('./routes/vendorroutes')
);
app.use('/api/vendor', require('./routes/vendorroutes'));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Server is running',
    timestamp: new Date(),
    uptime: process.uptime()
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Error handling middleware (must be last)
app.use(errorHandler);

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});