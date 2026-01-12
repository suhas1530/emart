#!/usr/bin/env node

require('dotenv').config();
const mongoose = require('mongoose');
const VendorQuote = require('./models/VendorQuote');

console.log('\n🔍 Testing VendorQuote Model...\n');

const testModel = async () => {
  try {
    const uri = process.env.MONGO_URI;
    await mongoose.connect(uri);
    console.log('✅ Connected to MongoDB!\n');

    // Test 1: Create a vendor quote
    console.log('📝 Test 1: Creating vendor quote...');
    const quote = await VendorQuote.create({
      itemId: 'prod-' + Date.now(),
      vendorName: 'Premium Supplies Ltd',
      vendorEmail: 'sales@premiumsupplies.com',
      vendorPhone: '+91-8765432109',
      quotedPrice: 2500.50,
      remarks: 'Best quality product with fast delivery',
      status: 'pending'
    });
    console.log(`✅ Created! ID: ${quote._id}\n`);

    // Test 2: Get GST price
    console.log('💰 Test 2: Calculate GST price...');
    const gstPrice = quote.priceWithGST;
    console.log(`✅ Price: ₹${quote.quotedPrice} | Price with 18% GST: ₹${gstPrice.toFixed(2)}\n`);

    // Test 3: Find by item
    console.log('🔎 Test 3: Finding quotes for item...');
    const itemQuotes = await VendorQuote.getQuotesForItem(quote.itemId);
    console.log(`✅ Found ${itemQuotes.length} quote(s)\n`);

    // Test 4: Get lowest quote
    console.log('📊 Test 4: Getting lowest quote...');
    const lowest = await VendorQuote.getLowestQuoteForItem(quote.itemId);
    if (lowest) {
      console.log(`✅ Lowest: ${lowest.vendorName} @ ₹${lowest.quotedPrice}\n`);
    }

    // Test 5: Update status
    console.log('✏️  Test 5: Updating quote status...');
    await quote.updateStatus('reviewed', 'Good quote, needs clarification on delivery');
    console.log(`✅ Status updated to: ${quote.status}\n`);

    // Test 6: Get admin quotes with pagination
    console.log('👨‍💼 Test 6: Getting admin quotes...');
    const adminQuotes = await VendorQuote.getAdminQuotes({
      page: 1,
      limit: 10,
      status: 'reviewed'
    });
    console.log(`✅ Found ${adminQuotes.quotes.length} quote(s) (Total: ${adminQuotes.total})\n`);

    // Test 7: Get statistics
    console.log('📈 Test 7: Getting quote statistics...');
    const stats = await VendorQuote.getQuotesStatistics();
    console.log(`✅ Total quotes: ${stats.totalQuotes}`);
    console.log(`✅ Average price: ₹${stats.averagePrice.toFixed(2)}`);
    console.log(`✅ Active vendors: ${stats.activeVendors}\n`);

    // Cleanup
    await VendorQuote.deleteOne({ _id: quote._id });
    console.log('🧹 Test data cleaned up.\n');

    console.log('='.repeat(60));
    console.log('✅ ALL MODEL TESTS PASSED!');
    console.log('='.repeat(60));
    console.log('\n✨ VendorQuote model is ready to use!\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.stack) console.error(error.stack);
  } finally {
    await mongoose.disconnect();
    console.log('Database disconnected.\n');
  }
};

testModel();
