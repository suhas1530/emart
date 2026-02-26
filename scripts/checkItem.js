require('dotenv').config();
const mongoose = require('mongoose');

(async () => {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected');
    const BasketItem = require('../models/BasketItem');
    const id = '69634cd794e1a8e806e38178';
    const it = await BasketItem.findById(id).lean();
    if (it) {
      console.log('FOUND:\n', JSON.stringify(it, null, 2));
    } else {
      console.log('NOT FOUND');
    }
  } catch (e) {
    console.error('ERR', e.message);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected');
  }
})();