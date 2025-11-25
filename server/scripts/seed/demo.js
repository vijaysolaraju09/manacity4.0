const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const Shop = require('../../models/Shop');
const Product = require('../../models/Product');
const User = require('../../models/User');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/manacity';

async function ensureBusinessOwner() {
  const phone = '9998887776';
  const password = 'password123';
  const existing = await User.findOne({ phone });
  if (existing) {
    return existing;
  }

  const hashed = await bcrypt.hash(password, 10);
  const user = await User.create({
    name: 'Demo Shop Owner',
    phone,
    password: hashed,
    role: 'business',
    businessStatus: 'approved',
    location: 'Central City',
    address: '123 Market Street',
    isVerified: true,
    verificationStatus: 'approved',
  });
  // eslint-disable-next-line no-console
  console.log('Created demo owner with phone', phone, 'and password', password);
  return user;
}

async function ensureShop(owner) {
  const existing = await Shop.findOne({ owner: owner._id, name: 'Demo General Store' });
  if (existing) return existing;

  const shop = await Shop.create({
    owner: owner._id,
    name: 'Demo General Store',
    category: 'Grocery',
    location: 'Central City',
    address: '123 Market Street, Central City',
    image: 'https://images.unsplash.com/photo-1556740749-887f6717d7e4',
    banner: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836',
    description: 'A sample neighbourhood store stocked with essentials.',
    isOpen: true,
    status: 'approved',
  });
  return shop;
}

async function ensureProducts(shop, owner) {
  const count = await Product.countDocuments({ shop: shop._id, isDeleted: { $ne: true } });
  if (count >= 2) return;

  const baseProducts = [
    {
      name: 'Everyday Essentials Kit',
      description: 'Bundle of daily groceries and household must-haves.',
      price: 349,
      mrp: 399,
      category: 'Grocery',
      image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836',
      stock: 25,
    },
    {
      name: 'Organic Fruit Basket',
      description: 'Fresh seasonal fruits sourced from local farms.',
      price: 499,
      mrp: 549,
      category: 'Grocery',
      image: 'https://images.unsplash.com/photo-1574226516831-e1dff420e43e',
      stock: 18,
    },
  ];

  for (const product of baseProducts) {
    // eslint-disable-next-line no-await-in-loop
    await Product.create({
      ...product,
      shop: shop._id,
      createdBy: owner._id,
      updatedBy: owner._id,
      available: true,
      status: 'active',
    });
  }
}

async function seed() {
  await mongoose.connect(MONGO_URI);
  const owner = await ensureBusinessOwner();
  const shop = await ensureShop(owner);
  await ensureProducts(shop, owner);
  await mongoose.disconnect();
  // eslint-disable-next-line no-console
  console.log('Demo seed complete');
}

seed().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Seeding failed', err);
  process.exit(1);
});
