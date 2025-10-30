const { Types } = require('mongoose');

jest.mock('../models/Product', () => ({
  findById: jest.fn(),
}));

jest.mock('../models/Cart', () => ({
  CartModel: {
    upsertItem: jest.fn(),
    findOne: jest.fn(),
    removeItem: jest.fn(),
  },
}));

const Product = require('../models/Product');
const { CartModel } = require('../models/Cart');
const {
  addToCart,
  getMyCart,
  removeFromCart,
} = require('../controllers/cartController');

describe('cartController', () => {
  const buildResponse = () => {
    const json = jest.fn();
    const res = {
      status: jest.fn(() => res),
      json,
    };
    return { res, json };
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('adds an item to the cart and returns normalized payload', async () => {
    const productId = new Types.ObjectId();
    const shopId = new Types.ObjectId();
    const userId = new Types.ObjectId();

    const productDoc = {
      _id: productId,
      name: 'Fresh Apples',
      price: 199.5,
      images: ['apple.png'],
      image: 'apple.png',
      shop: { _id: shopId, name: 'Greens', image: 'shop.png' },
      status: 'active',
      isDeleted: false,
    };

    Product.findById.mockReturnValue({
      populate: jest.fn().mockResolvedValue(productDoc),
    });

    const cartDoc = {
      _id: new Types.ObjectId(),
      currency: 'INR',
      items: [
        { productId, product: productId, qty: 2, unitPrice: 19950, appliedDiscount: 0 },
      ],
      subtotal: 39900,
      discountTotal: 0,
      grandTotal: 39900,
      updatedAt: new Date('2024-01-01T00:00:00.000Z'),
    };

    CartModel.upsertItem.mockResolvedValue({ cart: cartDoc, created: true });

    const req = {
      body: { productId: productId.toString(), quantity: 2 },
      user: { _id: userId },
      traceId: 'trace-123',
    };
    const { res, json } = buildResponse();
    const next = jest.fn();

    await addToCart(req, res, next);

    expect(Product.findById).toHaveBeenCalledWith(productId);
    expect(CartModel.upsertItem).toHaveBeenCalledWith(
      userId,
      expect.objectContaining({
        productId: expect.any(Types.ObjectId),
        product: expect.any(Types.ObjectId),
        qty: 2,
        unitPrice: 19950,
      }),
      { replaceQuantity: false },
    );

    expect(res.status).toHaveBeenCalledWith(201);
    const payload = json.mock.calls[0][0];
    expect(payload.ok).toBe(true);
    expect(payload.traceId).toBe('trace-123');
    expect(payload.data.cartItem).toMatchObject({
      productId: productId.toString(),
      shopId: shopId.toString(),
      pricePaise: 19950,
      name: 'Fresh Apples',
    });
    expect(payload.data.cart.totals).toEqual({
      subtotalPaise: 39900,
      discountPaise: 0,
      grandPaise: 39900,
    });
    expect(payload.data.cart.items[0]).toMatchObject({
      productId: productId.toString(),
      qty: 2,
      unitPricePaise: 19950,
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('returns an empty cart when nothing is stored', async () => {
    CartModel.findOne.mockResolvedValue(null);
    const req = { user: { _id: new Types.ObjectId() }, traceId: 'trace-1' };
    const { res, json } = buildResponse();
    const next = jest.fn();

    await getMyCart(req, res, next);

    expect(CartModel.findOne).toHaveBeenCalledWith({ userId: req.user._id });
    expect(json).toHaveBeenCalledWith({
      ok: true,
      data: {
        cart: {
          id: null,
          currency: 'INR',
          items: [],
          totals: { subtotalPaise: 0, discountPaise: 0, grandPaise: 0 },
          updatedAt: expect.any(String),
        },
      },
      traceId: 'trace-1',
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('removes an item from the cart and returns updated totals', async () => {
    const userId = new Types.ObjectId();
    const productId = new Types.ObjectId();
    const cartDoc = {
      _id: new Types.ObjectId(),
      currency: 'INR',
      items: [],
      subtotal: 0,
      discountTotal: 0,
      grandTotal: 0,
      updatedAt: new Date(),
    };

    CartModel.removeItem.mockResolvedValue({ cart: cartDoc, removed: true });

    const req = {
      params: { id: productId.toString() },
      query: {},
      user: { _id: userId },
      traceId: 'trace-xyz',
    };
    const { res, json } = buildResponse();
    const next = jest.fn();

    await removeFromCart(req, res, next);

    expect(CartModel.removeItem).toHaveBeenCalledWith(
      userId,
      expect.any(Types.ObjectId),
      undefined,
    );
    expect(json).toHaveBeenCalledWith({
      ok: true,
      data: {
        cart: expect.objectContaining({
          totals: { subtotalPaise: 0, discountPaise: 0, grandPaise: 0 },
        }),
      },
      traceId: 'trace-xyz',
    });
    expect(next).not.toHaveBeenCalled();
  });
});
