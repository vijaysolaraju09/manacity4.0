const mongoose = require('mongoose');
const { seedSampleCarts } = require('../utils/seedSampleCarts');
const { CartModel } = require('../models/Cart');

describe('Sample cart seeder', () => {
  it('creates carts for users with computed totals', async () => {
    jest
      .spyOn(CartModel.prototype, 'save')
      .mockImplementation(function () {
        return this.validate().then(() => this);
      });
    const userIds = [new mongoose.Types.ObjectId(), new mongoose.Types.ObjectId()];
    const productId = new mongoose.Types.ObjectId();
    const carts = await seedSampleCarts(userIds, productId);
    expect(carts).toHaveLength(2);
    expect(carts[0].grandTotal).toBe(10000);
  });
});

