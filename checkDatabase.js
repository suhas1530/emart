#!/usr/bin/env node

require('dotenv').config();
const mongoose = require('mongoose');

console.log('\n🔍 MongoDB Database Inspector...\n');

const inspectDatabase = async () => {
  try {
    const uri = process.env.MONGO_URI;
    await mongoose.connect(uri);
    console.log('✅ Connected to MongoDB!\n');

    // Get the database
    const db = mongoose.connection;
    
    // Get database name from connection
    const dbName = db.name || 'basavaamart';
    console.log(`📊 Database: ${dbName}\n`);

    // List all collections
    console.log('📋 Collections in this database:\n');
    
    const collections = await db.db.listCollections().toArray();
    
    if (collections.length === 0) {
      console.log('  (No collections yet)');
    } else {
      for (const collection of collections) {
        const colName = collection.name;
        
        // Get document count
        const count = await db.collection(colName).countDocuments();
        console.log(`  ✓ ${colName.padEnd(25)} - ${count} document(s)`);
      }
    }

    // Check specifically for VendorQuote collection
    console.log('\n' + '='.repeat(60));
    console.log('🔎 Checking VendorQuote Collection...\n');
    
    const vendorQuoteCount = await db.collection('vendorquotes').countDocuments().catch(() => 0);
    
    if (vendorQuoteCount > 0) {
      console.log(`✅ VendorQuote Collection FOUND with ${vendorQuoteCount} document(s)!\n`);
      
      // Show sample documents
      console.log('📦 Sample VendorQuote Documents:\n');
      const samples = await db.collection('vendorquotes').find().limit(3).toArray();
      
      samples.forEach((doc, index) => {
        console.log(`${index + 1}. Item: ${doc.itemId || 'N/A'}`);
        console.log(`   Vendor: ${doc.vendorName || 'N/A'}`);
        console.log(`   Email: ${doc.vendorEmail || 'N/A'}`);
        console.log(`   Price: ₹${doc.quotedPrice || 'N/A'}`);
        console.log(`   Status: ${doc.status || 'N/A'}`);
        console.log(`   Date: ${doc.submittedAt ? new Date(doc.submittedAt).toLocaleString() : 'N/A'}`);
        console.log('');
      });
    } else {
      console.log('⚠️  VendorQuote collection not found or empty');
      console.log('\n💡 Solution: Run this command to create sample data:');
      console.log('   node testVendorQuoteModel.js\n');
    }

    // Database statistics
    console.log('='.repeat(60));
    console.log('📊 Database Statistics:\n');
    
    const stats = await db.db.stats();
    console.log(`  Database Size: ${(stats.dataSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`  Indexes: ${stats.indexes}`);
    console.log(`  Collections: ${collections.length}\n`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('Database disconnected.\n');
  }
};

inspectDatabase();
