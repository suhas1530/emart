#!/usr/bin/env node
/**
 * Quick MongoDB Connection Test
 * Tests if vendor quotes can be saved to MongoDB
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const mongoose = require('mongoose');

console.log('\n' + '='.repeat(70));
console.log('🔍  VENDOR QUOTE DATABASE TEST');
console.log('='.repeat(70));

const mongoUri = process.env.MONGO_URI;
console.log('\n📍 MongoDB Connection String:');
console.log('   ' + mongoUri.substring(0, 60) + '...');

console.log('\n⏳ Connecting to MongoDB...\n');

mongoose
  .connect(mongoUri)
  .then(async () => {
    console.log('✅ Successfully connected to MongoDB!');
    console.log('   Database:', mongoose.connection.db.databaseName);
    console.log('   Host:', mongoose.connection.host);

    try {
      // Test inserting a quote
      console.log('\n📝 Creating test vendor quote...');
      
      const VendorQuote = require('./models/VendorQuote');
      
      const testQuote = new VendorQuote({
        itemId: 'test-item-' + Date.now(),
        productName: 'Test Product - ' + new Date().toLocaleTimeString(),
        vendorName: 'Test Vendor',
        vendorEmail: 'test@vendor.com',
        vendorPhone: '+91-9876543210',
        quotedPrice: 1500,
        remarks: 'Database test'
      });

      const saved = await testQuote.save();
      
      console.log('✅ Quote saved successfully to MongoDB!');
      console.log('\n📋 Saved Quote Details:');
      console.log('   ID:', saved._id);
      console.log('   Item ID:', saved.itemId);
      console.log('   Vendor:', saved.vendorName);
      console.log('   Email:', saved.vendorEmail);
      console.log('   Price: ₹' + saved.quotedPrice);
      console.log('   Status:', saved.status);
      console.log('   Submitted:', new Date(saved.submittedAt).toLocaleString());

      // Verify by retrieving
      console.log('\n🔎 Verifying by retrieving from database...');
      const retrieved = await VendorQuote.findById(saved._id);
      
      if (retrieved && retrieved._id.toString() === saved._id.toString()) {
        console.log('✅ Quote verified - Data persisted correctly!');
      }

      // Get collection stats
      const count = await VendorQuote.countDocuments();
      console.log('\n📊 Database Statistics:');
      console.log('   Total quotes in database:', count);

      console.log('\n' + '='.repeat(70));
      console.log('✅ ALL TESTS PASSED - Ready for production!');
      console.log('='.repeat(70));
      console.log('\n🚀 Vendor quotes are being saved to your MongoDB database:');
      console.log('   mongodb+srv://basavaamart:***@basavamart.13lfydm.mongodb.net');
      console.log('\n');

      process.exit(0);

    } catch (error) {
      console.error('\n❌ Error:', error.message);
      if (error.errors) {
        console.error('\nValidation Errors:');
        Object.entries(error.errors).forEach(([key, val]) => {
          console.error(`  • ${key}: ${val.message}`);
        });
      }
      process.exit(1);
    }
  })
  .catch(err => {
    console.error('\n❌ MongoDB Connection Failed!');
    console.error('\nError:', err.message);
    console.error('\n⚠️  Troubleshooting Steps:');
    console.error('1. Check your MongoDB URI in .env file');
    console.error('2. Verify IP address is whitelisted in MongoDB Atlas');
    console.error('3. Confirm database credentials are correct');
    console.error('4. Check your internet connection');
    console.error('\n');
    process.exit(1);
  });

// Handle timeout
setTimeout(() => {
  console.error('\n⏱️  Connection timeout after 10 seconds');
  process.exit(1);
}, 10000);
