const mongoose = require('mongoose');
const Shop = require('../models/Shop');

describe('Shop schema', () => {
  it('requires owner and name', async () => {
    const shop = new Shop({ category: 'general' });
    await expect(shop.validate()).rejects.toThrow();

    const valid = new Shop({
      owner: new mongoose.Types.ObjectId(),
      name: 'Test',
      category: 'cat',
      location: 'loc',
    });
    await expect(valid.validate()).resolves.toBeUndefined();
    expect(valid.toCardJSON()).toHaveProperty('name', 'Test');
  });
});
