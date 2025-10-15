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

    const { cart: cart1, created: created1 } = await CartModel.upsertItem(userId, {
      productId,
      qty: 2,
      unitPrice: 12900,
      appliedDiscount: 2500,
    });
    expect(created1).toBe(true);
    expect(cart1.items).toHaveLength(1);
    expect(cart1.subtotal).toBe(25800);
    expect(cart1.discountTotal).toBe(2500);
    expect(cart1.grandTotal).toBe(23300);

    findOne.mockResolvedValueOnce(cart1);
    const { cart: cart2, created: created2 } = await CartModel.upsertItem(userId, {
      productId,
      qty: 1,
      unitPrice: 12900,
    });
    expect(created2).toBe(false);
    expect(cart2.items[0].qty).toBe(3);
    expect(cart2.subtotal).toBe(38700);
    expect(cart2.grandTotal).toBe(36200);
  });

  it('removes items and recomputes totals', async () => {
    const userId = new mongoose.Types.ObjectId();
    const productId = new mongoose.Types.ObjectId();
    const cart = new CartModel({
      userId,
      items: [{ productId, qty: 1, unitPrice: 5000 }],
    });
    await cart.validate();
    jest.spyOn(CartModel, 'findOne').mockResolvedValueOnce(cart);

    const result = await CartModel.removeItem(userId, productId);
    expect(result).not.toBeNull();
    expect(result?.removed).toBe(true);
    expect(result?.cart.items).toHaveLength(0);
    expect(result?.cart.subtotal).toBe(0);
    expect(result?.cart.grandTotal).toBe(0);
  });

  it('has userId index', () => {
    const indexes = CartModel.schema.indexes();
    const idx = indexes.find(([fields]) => fields.userId === 1);
    expect(idx).toBeDefined();
  });
});

