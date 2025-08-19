const mongoose = require('mongoose');
const { ProductModel } = require('../models/Product');

describe('Product schema', () => {
  it('computes discountPercent and generates unique slug', async () => {
    const spy = jest
      .spyOn(ProductModel, 'exists')
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false);
    const product = new ProductModel({
      shopId: new mongoose.Types.ObjectId(),
      title: 'Test Product',
      category: 'general',
      pricing: { mrp: 100, price: 80, currency: 'USD' },
    });
    await product.validate();
    expect(product.slug).toBe('test-product-1');
    expect(product.pricing.discountPercent).toBe(20);
    spy.mockRestore();
  });

  it('requires alt text for images', async () => {
    const product = new ProductModel({
      shopId: new mongoose.Types.ObjectId(),
      title: 'Img Test',
      category: 'general',
      images: [{ url: 'https://example.com/img.jpg' }],
      pricing: { mrp: 10, price: 8, currency: 'USD' },
    });
    await expect(product.validate()).rejects.toThrow();
  });

  it('validates required fields', async () => {
    const product = new ProductModel({});
    await expect(product.validate()).rejects.toThrow();
  });

  it('has expected indexes', () => {
    const indexes = ProductModel.schema.indexes();
    const slugIndex = indexes.find(([idx]) => idx.slug === 1);
    const compound = indexes.find(
      ([idx]) => idx.shopId === 1 && idx.status === 1
    );
    expect(slugIndex).toBeDefined();
    expect(compound).toBeDefined();
  });
});

