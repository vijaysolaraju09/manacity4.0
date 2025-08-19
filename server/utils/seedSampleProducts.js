const { ProductModel } = require('../models/Product');

async function seedSampleProducts(shopIds, count = 10) {
  const products = [];
  for (const shopId of shopIds) {
    for (let i = 0; i < count; i++) {
      products.push({
        shopId,
        title: `Sample Product ${i + 1}`,
        description: '',
        images: [],
        category: 'general',
        tags: [],
        ratingAvg: 0,
        ratingCount: 0,
        pricing: { mrp: 100, price: 90, currency: 'USD' },
        status: 'active',
      });
    }
  }
  return ProductModel.insertMany(products);
}

module.exports = { seedSampleProducts };

