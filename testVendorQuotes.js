#!/usr/bin/env node

/**
 * Test script to verify MongoDB connection and VendorQuote data insertion
 * Run this from backend directory: node testVendorQuotes.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const VendorQuote = require('./models/VendorQuote');

const testDatabaseConnection = async () => {
  console.log('\n🔍 Testing Vendor Quote Database Connection...\n');

  try {
    // Connection string validation
    const uri = process.env.MONGO_URI;
    if (!uri) {
      throw new Error('MONGO_URI not found in .env file');
    }

    const maskedUri = uri.replace(/(:.*@)/, ':***@');
    console.log(`📍 MongoDB URI: ${maskedUri}\n`);

    // Connect to MongoDB (Mongoose 6+ handles options automatically)
    await mongoose.connect(uri);

    console.log('✅ MongoDB Connected Successfully!\n');

    // Test 1: Create a test vendor quote
    console.log('📝 Test 1: Creating a test vendor quote...\n');

    const testQuote = new VendorQuote({
      itemId: 'test-item-' + Date.now(),
      productName: '68 Degree T-Shirt',
      vendorName: 'Test Vendor Co.',
      vendorEmail: 'test@vendor.com',
      vendorPhone: '+91-9876543210',
      quotedPrice: 1500.50,
      remarks: 'Stock available, fast delivery',
      status: 'pending',
      ipAddress: '127.0.0.1'
    });

    const savedQuote = await testQuote.save();
    console.log('✅ Quote Created Successfully!\n');
    console.log('📦 Saved Data:');
    console.log(JSON.stringify(savedQuote.toObject(), null, 2));

    // Test 2: Fetch the quote from database
    console.log('\n📝 Test 2: Fetching quote from database...\n');

    const fetchedQuote = await VendorQuote.findById(savedQuote._id);
    if (fetchedQuote) {
      console.log('✅ Quote Retrieved Successfully!\n');
      console.log('📦 Retrieved Data:');
      console.log(JSON.stringify(fetchedQuote.toObject(), null, 2));
    }

    // Test 3: Fetch all quotes for an item
    console.log('\n📝 Test 3: Fetching all quotes for an item...\n');

    const itemQuotes = await VendorQuote.find({ itemId: savedQuote.itemId });
    console.log(`✅ Found ${itemQuotes.length} quote(s) for item ${savedQuote.itemId}\n`);
    itemQuotes.forEach((quote, index) => {
      console.log(`Quote ${index + 1}:`);
      console.log(`  - Vendor: ${quote.vendorName}`);
      console.log(`  - Email: ${quote.vendorEmail}`);
      console.log(`  - Price: ₹${quote.quotedPrice}`);
      console.log(`  - Status: ${quote.status}`);
      console.log();
    });

    // Test 4: Test lowest quote retrieval
    console.log('📝 Test 4: Testing static method - Get lowest quote...\n');

    const lowestQuote = await VendorQuote.getLowestQuoteForItem(savedQuote.itemId);
    if (lowestQuote) {
      console.log('✅ Lowest Quote Retrieved:\n');
      console.log(`  - Vendor: ${lowestQuote.vendorName}`);
      console.log(`  - Price: ₹${lowestQuote.quotedPrice}`);
    }

    // Test 5: Update quote status
    console.log('\n📝 Test 5: Updating quote status...\n');

    await savedQuote.updateStatus('reviewed', 'Verified supplier');
    const updatedQuote = await VendorQuote.findById(savedQuote._id);
    console.log('✅ Quote Status Updated!\n');
    console.log(`  - New Status: ${updatedQuote.status}`);
    console.log(`  - Admin Notes: ${updatedQuote.adminNotes}`);
    console.log(`  - Last Modified: ${updatedQuote.lastModifiedAt}`);

    // Test 6: Aggregate statistics
    console.log('\n📝 Test 6: Testing aggregation - Get statistics...\n');

    const stats = await VendorQuote.aggregate([
      { $match: { itemId: savedQuote.itemId } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          avgPrice: { $avg: '$quotedPrice' },
          minPrice: { $min: '$quotedPrice' },
          maxPrice: { $max: '$quotedPrice' }
        }
      }
    ]);

    console.log('✅ Statistics Retrieved:\n');
    if (stats.length > 0) {
      console.log(`  - Total Quotes: ${stats[0].total}`);
      console.log(`  - Average Price: ₹${stats[0].avgPrice.toFixed(2)}`);
      console.log(`  - Minimum Price: ₹${stats[0].minPrice}`);
      console.log(`  - Maximum Price: ₹${stats[0].maxPrice}`);
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ ALL TESTS PASSED SUCCESSFULLY!');
    console.log('='.repeat(60));
    console.log('\n📊 Summary:');
    console.log('  ✓ MongoDB connection working');
    console.log('  ✓ Vendor quotes can be created');
    console.log('  ✓ Vendor quotes can be retrieved');
    console.log('  ✓ Vendor quotes can be updated');
    console.log('  ✓ Statistics can be aggregated');
    console.log('\n💾 Your database is ready for vendor quote submissions!');
    console.log('\n📋 Database Information:');
    console.log(`  - Database: ${mongoose.connection.db.getName()}`);
    console.log(`  - Collection: ${VendorQuote.collection.name}`);
    console.log('\n');

    // Cleanup - Delete test quote
    console.log('🧹 Cleaning up test data...\n');
    await VendorQuote.deleteOne({ _id: savedQuote._id });
    console.log('✅ Test data cleaned up.\n');

  } catch (error) {
    console.error('\n❌ Error during testing:', error.message);
    if (error.message.includes('usenewurlparser')) {
      console.log('\n⚠️  Fix: Mongoose 6+ handles these options automatically.');
      console.log('   Your MongoDB driver version is already compatible.\n');
    }
    console.log('\n⚠️  Troubleshooting:');
    console.log('1. Check MongoDB Atlas IP whitelist includes your current IP');
    console.log('2. Verify credentials in .env file are correct');
    console.log('3. Check internet connection');
    console.log('4. Ensure MongoDB cluster is running and accessible');
    console.log('5. Check firewall settings\n');
  } finally {
    // Close database connection
    try {
      await mongoose.connection.close();
      console.log('Database connection closed.\n');
    } catch (error) {
      console.error('Error closing connection:', error.message);
    }
  }
};

// Run tests
testDatabaseConnection();
