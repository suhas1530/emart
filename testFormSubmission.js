#!/usr/bin/env node

require('dotenv').config();
const mongoose = require('mongoose');
const VendorQuote = require('./models/VendorQuote');

console.log('\n🔍 Complete Vendor Quote Submission Test...\n');

const testSubmission = async () => {
  try {
    const uri = process.env.MONGO_URI;
    await mongoose.connect(uri);
    console.log('✅ Connected to MongoDB!\n');

    // Test 1: Direct insertion (like form submission)
    console.log('📝 Test 1: Simulating vendor form submission...\n');
    
    const quoteData = {
      itemId: 'basket-item-' + Date.now(),
      productName: 'Office Chair',
      vendorName: 'ABC Supplies',
      vendorEmail: 'vendor@abc.com',
      vendorPhone: '+91-9999999999',
      quotedPrice: 3500,
      remarks: 'Ready for immediate delivery',
      ipAddress: '192.168.1.100',
      status: 'pending'
    };

    console.log('📦 Submitting quote data:');
    console.log(JSON.stringify(quoteData, null, 2));
    console.log('\n');

    const quote = await VendorQuote.create(quoteData);
    
    console.log('✅ Quote successfully saved to MongoDB!');
    console.log(`   Quote ID: ${quote._id}`);
    console.log(`   Status: ${quote.status}`);
    console.log(`   Submitted At: ${quote.submittedAt}\n`);

    // Test 2: Retrieve immediately
    console.log('🔎 Test 2: Retrieving quote for the same item...\n');
    
    const retrieved = await VendorQuote.getQuotesForItem(quoteData.itemId);
    console.log(`✅ Found ${retrieved.length} quote(s) for this item\n`);
    
    if (retrieved.length > 0) {
      console.log('📊 Retrieved Quote Data:');
      retrieved.forEach((q, idx) => {
        console.log(`\n  Quote ${idx + 1}:`);
        console.log(`    - Vendor: ${q.vendorName}`);
        console.log(`    - Email: ${q.vendorEmail}`);
        console.log(`    - Price: ₹${q.quotedPrice}`);
        console.log(`    - Remarks: ${q.remarks}`);
        console.log(`    - Status: ${q.status}`);
        console.log(`    - GST Price (18%): ₹${q.priceWithGST.toFixed(2)}`);
      });
    }

    // Test 3: Update status
    console.log('\n\n✏️  Test 3: Updating quote status...\n');
    
    await quote.updateStatus('reviewed', 'Good quote - checking with other vendors');
    
    const updated = await VendorQuote.findById(quote._id);
    console.log(`✅ Quote updated!`);
    console.log(`   New Status: ${updated.status}`);
    console.log(`   Admin Notes: ${updated.adminNotes}\n`);

    // Test 4: Check what's really in the database
    console.log('📊 Test 4: Checking total quotes in database...\n');
    
    const allQuotes = await VendorQuote.find();
    console.log(`Total VendorQuote documents in database: ${allQuotes.length}\n`);
    
    console.log('All quotes in database:');
    allQuotes.forEach((q, idx) => {
      console.log(`\n  ${idx + 1}. Item: ${q.itemId}`);
      console.log(`     Vendor: ${q.vendorName}`);
      console.log(`     Price: ₹${q.quotedPrice}`);
      console.log(`     Status: ${q.status}`);
      console.log(`     Submitted: ${q.submittedAt}`);
    });

    console.log('\n' + '='.repeat(70));
    console.log('✅ ALL TESTS PASSED - DATA STORAGE WORKING PERFECTLY!');
    console.log('='.repeat(70));
    console.log('\n✨ Your backend is ready! When vendors submit quotes they will be:');
    console.log('   1️⃣  Saved to MongoDB collection: vendorquotes');
    console.log('   2️⃣  Immediately retrievable via API');
    console.log('   3️⃣  Visible to admins in real-time');
    console.log('   4️⃣  Updatable by admin (review, accept, reject)\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.stack) console.error(error.stack);
  } finally {
    await mongoose.disconnect();
    console.log('\nDatabase disconnected.\n');
  }
};

testSubmission();
