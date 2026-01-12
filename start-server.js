#!/usr/bin/env node

/**
 * BasavaMart Backend Server Startup
 * This script starts the Express server and connects to MongoDB
 */

require('dotenv').config();
const path = require('path');

console.log('\n' + '='.repeat(70));
console.log('🚀 BasavaMart Backend Server Starting...');
console.log('='.repeat(70) + '\n');

// Verify environment
console.log('📋 Verifying Environment Variables:');
const requiredEnvVars = ['MONGO_URI', 'PORT'];
requiredEnvVars.forEach(envVar => {
  const value = process.env[envVar];
  if (value) {
    const display = envVar === 'MONGO_URI' 
      ? value.replace(/:[^:]*@/, ':***@') 
      : value;
    console.log(`  ✅ ${envVar}: ${display}`);
  } else {
    console.log(`  ❌ ${envVar}: NOT SET`);
  }
});

console.log('\n📦 Starting Express Server...\n');

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const {
  quoteSubmissionLimiter,
  apiLimiter,
  adminOperationLimiter,
  sanitizeData,
  xssProtection,
  parameterPollutionPrevention,
  helmetProtection,
  corsOptions,
  errorHandler
} = require('./middleware/securityMiddleware');

const app = express();

// Middleware
app.use(helmetProtection);
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(sanitizeData);
app.use(xssProtection);
app.use(parameterPollutionPrevention);

// Static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Rate limiting
app.use('/api/vendor/submit-quote', quoteSubmissionLimiter);
app.use('/api/', apiLimiter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'BasavaMart Backend is running',
    timestamp: new Date().toISOString(),
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

// API Routes
console.log('📂 Loading API Routes:');

try {
  const brandRoutes = require('./routes/brandsroute');
  app.use('/api/brands', brandRoutes);
  console.log('  ✅ Brands Routes');
} catch (e) {
  console.log('  ⚠️  Brands Routes (error):', e.message);
}

try {
  const vendorRoutes = require('./routes/vendorroutes_new');
  app.use('/api/vendor', vendorRoutes);
  app.use('/api', vendorRoutes);
  console.log('  ✅ Vendor Quote Routes');
} catch (e) {
  console.log('  ⚠️  Vendor Quote Routes (error):', e.message);
}

try {
  const basketRoutes = require('./routes/basketRoutes');
  app.use('/api/admin/basket-items', basketRoutes);
  app.use('/api/admin/basket-item', basketRoutes);
  console.log('  ✅ Basket Routes');
} catch (e) {
  console.log('  ⚠️  Basket Routes (error):', e.message);
}

try {
  const adRoutes = require('./routes/advertisementRoutes');
  app.use('/api/advertisements', adRoutes);
  console.log('  ✅ Advertisement Routes');
} catch (e) {
  console.log('  ⚠️  Advertisement Routes (error):', e.message);
}

try {
  const bannerRoutes = require('./routes/bannerRoutes');
  app.use('/api/banners', bannerRoutes);
  console.log('  ✅ Banner Routes');
} catch (e) {
  console.log('  ⚠️  Banner Routes (error):', e.message);
}

try {
  const testimonialRoutes = require('./routes/testimonialRoutes');
  app.use('/api/testimonials', testimonialRoutes);
  console.log('  ✅ Testimonial Routes');
} catch (e) {
  console.log('  ⚠️  Testimonial Routes (error):', e.message);
}

// Error handling
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found'
  });
});

// Connect to MongoDB
const PORT = process.env.PORT || 8080;

console.log('\n🔌 Connecting to MongoDB...\n');

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log('✅ MongoDB Connected Successfully!');
    try {
      const dbName = mongoose.connection.db?.getName?.() || 'BasavaMart';
      console.log(`   Database: ${dbName}`);
    } catch (e) {
      console.log(`   Database: Connected`);
    }
    console.log(`   Host: ${mongoose.connection.host}`);
    console.log(`   Port: ${mongoose.connection.port}\n`);
    
    // Start server
    app.listen(PORT, () => {
      console.log('='.repeat(70));
      console.log(`✅ Server Started Successfully!`);
      console.log('='.repeat(70));
      console.log(`\n🌐 API Server running on: http://localhost:${PORT}`);
      console.log(`📡 API Base URL: http://localhost:${PORT}/api`);
      console.log(`🏥 Health Check: http://localhost:${PORT}/health`);
      console.log(`\n📝 Available Endpoints:`);
      console.log(`   POST   /api/vendor/submit-quote           - Submit vendor quote`);
      console.log(`   GET    /api/vendor/quotes/:itemId        - Get quotes for item`);
      console.log(`   GET    /api/vendor/product/:itemId       - Get product details`);
      console.log(`   GET    /api/admin/vendor-quotes          - Get all quotes (admin)`);
      console.log(`   PATCH  /api/admin/vendor-quotes/:id      - Update quote (admin)`);
      console.log(`   DELETE /api/admin/vendor-quotes/:id      - Delete quote (admin)`);
      console.log(`   GET    /api/admin/vendor-quotes/stats    - Get statistics (admin)\n`);
      console.log(`💡 Press Ctrl+C to stop the server\n`);
    });
  })
  .catch(err => {
    console.error('❌ MongoDB Connection Failed!');
    console.error('   Error:', err.message);
    console.error('\n   Please check:');
    console.error('   1. MongoDB URI in .env is correct');
    console.error('   2. MongoDB Atlas cluster is running');
    console.error('   3. IP address is whitelisted in Atlas\n');
    process.exit(1);
  });

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('\n⏹️  Server shutting down...');
  mongoose.connection.close();
  process.exit(0);
});
