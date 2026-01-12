#!/usr/bin/env node

require('dotenv').config();
const mongoose = require('mongoose');

console.log('\n🔍 Simple MongoDB Connection Test...\n');

const testConnection = async () => {
  try {
    const uri = process.env.MONGO_URI;
    console.log('📍 Connecting to MongoDB...');
    
    await mongoose.connect(uri);
    console.log('✅ Connected!\n');

    // Define schema inline to avoid any import issues
    const quoteSchema = new mongoose.Schema({
      itemId: String,
      vendorName: String,
      vendorEmail: String,
      vendorPhone: String,
      quotedPrice: Number,
      remarks: String,
      status: String,
      submittedAt: { type: Date, default: Date.now }
    });

    const VendorQuote = mongoose.model('VendorQuote_Test', quoteSchema);

    // Create test data
    console.log('📝 Creating test vendor quote...\n');
    
    const quote = await VendorQuote.create({
      itemId: 'item-' + Date.now(),
      vendorName: 'Test Vendor Inc',
      vendorEmail: 'vendor@test.com',
      vendorPhone: '+91-9876543210',
      quotedPrice: 1500.00,
      remarks: 'Ready to supply',
      status: 'pending'
    });

    console.log('✅ Quote Saved Successfully!\n');
    console.log('📦 Data saved to MongoDB:');
    console.log(`  - Quote ID: ${quote._id}`);
    console.log(`  - Item ID: ${quote.itemId}`);
    console.log(`  - Vendor: ${quote.vendorName}`);
    console.log(`  - Email: ${quote.vendorEmail}`);
    console.log(`  - Price: ₹${quote.quotedPrice}`);
    console.log(`  - Status: ${quote.status}`);
    console.log(`  - Submitted: ${quote.submittedAt}\n`);

    // Fetch it back
    console.log('📖 Fetching quote from database...\n');
    const fetched = await VendorQuote.findById(quote._id);
    
    if (fetched) {
      console.log('✅ Quote Retrieved!\n');
      console.log('📦 Retrieved Data:');
      console.log(JSON.stringify(fetched.toObject(), null, 2));
    }

    // Get all quotes for this item
    console.log('\n🔎 Finding all quotes for this item...\n');
    const allQuotes = await VendorQuote.find({ itemId: quote.itemId });
    console.log(`✅ Found ${allQuotes.length} quote(s)\n`);

    // Update the quote
    console.log('✏️  Updating quote status...\n');
    fetched.status = 'reviewed';
    await fetched.save();
    console.log('✅ Quote updated!\n');

    // Get database info
    console.log('📊 Database Information:');
    console.log(`  - Host: ${mongoose.connection.host}`);
    console.log(`  - Port: ${mongoose.connection.port}`);
    console.log(`  - State: ${mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected'}\n`);

    // Cleanup
    console.log('🧹 Cleaning up test data...\n');
    await VendorQuote.deleteOne({ _id: quote._id });
    console.log('✅ Test data deleted.\n');

    console.log('='.repeat(60));
    console.log('✅ ALL TESTS PASSED!');
    console.log('='.repeat(60));
    console.log('\n✨ Your MongoDB is working perfectly!');
    console.log('✨ Vendor quotes will be saved to the database!\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await mongoose.disconnect();
    console.log('Database disconnected.\n');
  }
};

testConnection();
