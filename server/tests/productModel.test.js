const mongoose = require('mongoose');
const Product = require('../models/Product');

describe('Product schema', () => {
  it('should have default audit fields', () => {
    const p = new Product({
      shop: new mongoose.Types.ObjectId(),
      createdBy: new mongoose.Types.ObjectId(),
      name: 'Test',
      price: 10,
      mrp: 20,
    });
    expect(p.isDeleted).toBe(false);
    expect(p.schemaVersion).toBe(1);
    expect(p.city).toBeUndefined();
  });
});
