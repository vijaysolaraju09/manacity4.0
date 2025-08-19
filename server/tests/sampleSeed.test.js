const mongoose = require('mongoose');
const { ProductModel } = require('../models/Product');
const { seedSampleProducts } = require('../utils/seedSampleProducts');

describe('Sample product seeder', () => {
  it('creates 10 products per shop', async () => {
    const spy = jest.spyOn(ProductModel, 'insertMany').mockResolvedValue([]);
    const shopIds = [new mongoose.Types.ObjectId(), new mongoose.Types.ObjectId()];
    await seedSampleProducts(shopIds);
    expect(spy).toHaveBeenCalled();
    const products = spy.mock.calls[0][0];
    expect(products).toHaveLength(20);
    const firstShopCount = products.filter(
      (p) => p.shopId.toString() === shopIds[0].toString()
    ).length;
    expect(firstShopCount).toBe(10);
    spy.mockRestore();
  });
});

