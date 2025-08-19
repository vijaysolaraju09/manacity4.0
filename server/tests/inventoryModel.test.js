const mongoose = require('mongoose');
const { InventoryModel } = require('../models/Inventory');

describe('Inventory schema', () => {
  it('derives isInStock from stock and threshold', async () => {
    const inv = new InventoryModel({
      productId: new mongoose.Types.ObjectId(),
      stock: 5,
      threshold: 2,
    });
    await inv.validate();
    expect(inv.isInStock).toBe(true);
    inv.stock = 1;
    await inv.validate();
    expect(inv.isInStock).toBe(false);
  });

  it('adjustStock uses atomic $inc', async () => {
    const spy = jest
      .spyOn(InventoryModel, 'findOneAndUpdate')
      .mockResolvedValue({ stock: 0, threshold: 0, save: jest.fn() });
    await InventoryModel.adjustStock('pid', null, 3);
    expect(spy).toHaveBeenCalledWith(
      { productId: 'pid' },
      { $inc: { stock: 3 } },
      { new: true, upsert: true }
    );
    spy.mockRestore();
  });

  it('has compound unique index on productId and variantId', () => {
    const indexes = InventoryModel.schema.indexes();
    const compound = indexes.find(
      ([idx, opts]) => idx.productId === 1 && idx.variantId === 1 && opts.unique
    );
    expect(compound).toBeDefined();
  });
});

