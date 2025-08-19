const mongoose = require('mongoose');
const { ShopModel } = require('../models/Shop');

describe('Shop schema', () => {
  it('validates required fields', async () => {
    const shop = new ShopModel({ name: 'Test Shop', category: 'general' });
    await expect(shop.validate()).rejects.toThrow();
  });

  it('autogenerates unique slug', async () => {
    const spy = jest
      .spyOn(ShopModel, 'exists')
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false);
    const shop = new ShopModel({
      ownerId: new mongoose.Types.ObjectId(),
      name: 'My Shop',
      category: 'general',
    });
    await shop.validate();
    expect(shop.slug).toBe('my-shop-1');
    spy.mockRestore();
  });

  it('has geo 2dsphere index', () => {
    const indexes = ShopModel.schema.indexes();
    const geoIndex = indexes.find(([idx]) => idx.geo === '2dsphere');
    expect(geoIndex).toBeDefined();
  });
});
