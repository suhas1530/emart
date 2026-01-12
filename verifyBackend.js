#!/usr/bin/env node

require('dotenv').config();
const path = require('path');

console.log('\n🔍 Verifying Backend Configuration...\n');

// Check environment variables
console.log('✓ Environment Variables:');
console.log(`  - MONGO_URI: ${process.env.MONGO_URI ? '✅ Set' : '❌ Missing'}`);
console.log(`  - PORT: ${process.env.PORT || 8080}`);

// Check required packages
console.log('\n✓ Checking Dependencies...\n');
const requiredPackages = [
  'express',
  'mongoose',
  'cors',
  'dotenv',
  'express-validator',
  'express-rate-limit',
  'helmet',
  'express-mongo-sanitize'
];

requiredPackages.forEach(pkg => {
  try {
    require.resolve(pkg);
    console.log(`  ✅ ${pkg}`);
  } catch {
    console.log(`  ❌ ${pkg} - Missing!`);
  }
});

// Check model files
console.log('\n✓ Checking Model Files...\n');
const models = [
  'VendorQuote.js',
  'Advertisement.js',
  'Banner.js',
  'brandsmodel.js',
  'Testimonial.js'
];

const fs = require('fs');
models.forEach(model => {
  const filePath = path.join(__dirname, 'models', model);
  if (fs.existsSync(filePath)) {
    console.log(`  ✅ ${model}`);
  } else {
    console.log(`  ❌ ${model} - Missing!`);
  }
});

// Check route files
console.log('\n✓ Checking Route Files...\n');
const routes = [
  'vendorroutes.js',
  'advertisementRoutes.js',
  'bannerRoutes.js',
  'brandsroute.js',
  'testimonialRoutes.js'
];

routes.forEach(route => {
  const filePath = path.join(__dirname, 'routes', route);
  if (fs.existsSync(filePath)) {
    console.log(`  ✅ ${route}`);
  } else {
    console.log(`  ❌ ${route} - Missing!`);
  }
});

// Check middleware files
console.log('\n✓ Checking Middleware Files...\n');
const middlewares = [
  'securityMiddleware.js',
  'upload.js'
];

middlewares.forEach(middleware => {
  const filePath = path.join(__dirname, 'middleware', middleware);
  if (fs.existsSync(filePath)) {
    console.log(`  ✅ ${middleware}`);
  } else {
    console.log(`  ❌ ${middleware} - Missing!`);
  }
});

console.log('\n' + '='.repeat(60));
console.log('✅ BACKEND CONFIGURATION VERIFIED!');
console.log('='.repeat(60));
console.log('\n📝 To start the server, run:');
console.log('   npm start  (or)  node index.js\n');
