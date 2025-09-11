const mongoose = require('mongoose');
const Product = require('../models/Product');
const Shop = require('../models/Shop');
const User = require('../models/User');

(async () => {
  const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/manacity';
  await mongoose.connect(uri);
  try {
    const user = await User.findOne();
    const shop = await Shop.findOne();
    if (!user || !shop) {
      console.log('Seed requires at least one user and shop');
      return process.exit(1);
    }
    await Product.create({
      shop: shop._id,
      createdBy: user._id,
      updatedBy: user._id,
      name: 'Seed Product',
      price: 10,
      mrp: 20,
      city: shop.location,
    });
    console.log('Seeded product');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
