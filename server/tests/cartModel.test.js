const mongoose = require('mongoose');
const { CartModel } = require('../models/Cart');

describe('Cart schema', () => {
  beforeEach(() => {
    jest
      .spyOn(CartModel.prototype, 'save')
      .mockImplementation(function () {
        return this.validate().then(() => this);
      });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('upserts items and computes totals', async () => {
    const userId = new mongoose.Types.ObjectId();
    const productId = new mongoose.Types.ObjectId();
    const findOne = jest
      .spyOn(CartModel, 'findOne')
      .mockResolvedValueOnce(null);

    const cart1 = await CartModel.upsertItem(userId, {
      productId,
      qty: 2,
      unitPrice: 10,
      appliedDiscount: 1,
    });
    expect(cart1.items).toHaveLength(1);
    expect(cart1.subtotal).toBe(20);
    expect(cart1.discountTotal).toBe(1);
    expect(cart1.grandTotal).toBe(19);

    findOne.mockResolvedValueOnce(cart1);
    const cart2 = await CartModel.upsertItem(userId, {
      productId,
      qty: 1,
      unitPrice: 10,
    });
    expect(cart2.items[0].qty).toBe(3);
    expect(cart2.subtotal).toBe(30);
    expect(cart2.grandTotal).toBe(29);
  });

  it('removes items and recomputes totals', async () => {
    const userId = new mongoose.Types.ObjectId();
    const productId = new mongoose.Types.ObjectId();
    const cart = new CartModel({
      userId,
      items: [{ productId, qty: 1, unitPrice: 10 }],
    });
    await cart.validate();
    jest.spyOn(CartModel, 'findOne').mockResolvedValueOnce(cart);

    const res = await CartModel.removeItem(userId, productId);
    expect(res.items).toHaveLength(0);
    expect(res.subtotal).toBe(0);
    expect(res.grandTotal).toBe(0);
  });

  it('has userId index', () => {
    const indexes = CartModel.schema.indexes();
    const idx = indexes.find(([fields]) => fields.userId === 1);
    expect(idx).toBeDefined();
  });
});

