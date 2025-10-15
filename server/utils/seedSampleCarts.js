const { CartModel } = require('../models/Cart');

async function seedSampleCarts(userIds, productId) {
  const carts = [];
  for (const userId of userIds) {
    const cart = new CartModel({
      userId,
      items: [{ productId, qty: 1, unitPrice: 10000 }],
      currency: 'INR',
    });
    await cart.save();
    carts.push(cart);
  }
  return carts;
}

module.exports = { seedSampleCarts };

