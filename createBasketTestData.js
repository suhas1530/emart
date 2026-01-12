const mongoose = require('mongoose');
require('dotenv').config();

const BasketItem = require('./models/BasketItem');

async function createTestData() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✓ Connected to MongoDB');

    // Clear existing test data
    await BasketItem.deleteMany({});
    console.log('✓ Cleared existing basket items');

    // Create test basket items
    const testItems = [
      {
        productName: 'Premium Coffee Beans',
        productImage: '/uploads/products/coffee-beans.jpg',
        variant: { name: 'Ethiopian Blend', color: 'Brown' },
        quantity: 5,
        memberId: null,
        memberName: 'John Doe',
        memberEmail: 'john@example.com',
        memberPhone: '+1234567890',
        memberNote: 'Need high-quality premium beans',
        memberMessage: 'Looking for the best quality available. Need delivery by Friday.',
        basePrice: 500,
        totalPrice: 2500,
        status: 'pending'
      },
      {
        productName: 'Organic Tea Collection',
        productImage: '/uploads/products/tea-collection.jpg',
        variant: { name: 'Assorted Pack', color: 'Green' },
        quantity: 10,
        memberId: null,
        memberName: 'Jane Smith',
        memberEmail: 'jane@example.com',
        memberPhone: '+1987654321',
        memberNote: 'Different varieties wanted',
        memberMessage: 'Interested in organic and eco-friendly options',
        basePrice: 300,
        totalPrice: 3000,
        status: 'pending'
      },
      {
        productName: 'Artisan Chocolate Bar',
        productImage: '/uploads/products/chocolate.jpg',
        variant: { name: 'Dark 70%', color: 'Brown' },
        quantity: 20,
        memberId: null,
        memberName: 'Mike Johnson',
        memberEmail: 'mike@example.com',
        memberPhone: '+1555555555',
        memberNote: 'Bulk order for resale',
        memberMessage: 'Wholesale pricing needed',
        basePrice: 100,
        totalPrice: 2000,
        status: 'pending'
      }
    ];

    const created = await BasketItem.insertMany(testItems);
    console.log(`✓ Created ${created.length} test basket items:`);
    created.forEach((item, index) => {
      console.log(`  ${index + 1}. ${item.productName} (ID: ${item._id})`);
    });

    console.log('\n✓ Test data created successfully!');
    console.log('\nYou can now use these IDs in the vendor quote form:');
    created.forEach((item) => {
      console.log(`  /vendor-quote/${item._id}`);
    });

  } catch (error) {
    console.error('Error creating test data:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n✓ Database connection closed');
  }
}

// Run the script
createTestData();
