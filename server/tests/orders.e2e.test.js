const express = require('express');
const request = require('supertest');

let mockUser;
let shopRecord;
let productDocs = [];

jest.mock('../services/notificationService', () => ({
  notifyUser: jest.fn(() => Promise.resolve()),
}));

jest.mock('../middleware/authMiddleware', () => (req, _res, next) => {
  req.user = mockUser;
  next();
});

jest.mock('../models/Product', () => ({
  find: jest.fn(() => ({
    lean: jest.fn().mockImplementation(() => Promise.resolve(productDocs)),
  })),
}));

jest.mock('../models/Shop', () => ({
  findById: jest.fn(() => ({
    lean: jest.fn().mockImplementation(() => Promise.resolve(shopRecord)),
    select: jest.fn().mockImplementation(() => ({
      lean: jest
        .fn()
        .mockImplementation(() => Promise.resolve({ owner: shopRecord?.owner })),
    })),
  })),
  find: jest.fn(() => ({
    select: jest.fn().mockImplementation(() => ({
      lean: jest
        .fn()
        .mockImplementation(() => Promise.resolve(shopRecord ? [{ _id: shopRecord._id }] : [])),
    })),
  })),
}));

jest.mock('../models/Order', () => {
  const orders = [];

  const cloneOrder = (order) => {
    const { save, toJSON, toObject, lean, ...rest } = order;
    return JSON.parse(
      JSON.stringify({
        ...rest,
      }),
    );
  };

  const matchesFilter = (order, filter = {}) => {
    return Object.entries(filter).every(([key, value]) => {
      if (key === 'user') return String(order.user) === String(value);
      if (key === 'shop') {
        if (value && Array.isArray(value.$in)) {
          return value.$in.some((shopId) => String(order.shop) === String(shopId));
        }
        return String(order.shop) === String(value);
      }
      return order[key] === value;
    });
  };

  const create = jest.fn(async (payload) => {
    const order = {
      ...payload,
      _id: `order-${orders.length + 1}`,
      createdAt: new Date(),
      updatedAt: new Date(),
      timeline: Array.isArray(payload.timeline) ? [...payload.timeline] : [],
      save: async function () {
        this.updatedAt = new Date();
        return this;
      },
    };
    order.toJSON = function () {
      return cloneOrder(this);
    };
    order.toObject = function () {
      return cloneOrder(this);
    };
    order.lean = async function () {
      return cloneOrder(this);
    };
    orders.push(order);
    return order;
  });

  const find = jest.fn((filter = {}) => {
    let results = orders.filter((order) => matchesFilter(order, filter));
    const query = {
      _whereField: null,
      sort: jest.fn().mockImplementation(() => query),
      skip: jest.fn().mockImplementation(() => query),
      limit: jest.fn().mockImplementation(() => query),
      where: jest.fn().mockImplementation((field) => {
        query._whereField = field;
        return query;
      }),
      equals: jest.fn().mockImplementation((value) => {
        if (query._whereField) {
          results = results.filter((order) => {
            if (query._whereField === 'status') {
              return order.status === value;
            }
            return order[query._whereField] === value;
          });
        }
        return query;
      }),
      lean: jest
        .fn()
        .mockImplementation(() => Promise.resolve(results.map((order) => cloneOrder(order)))),
    };
    return query;
  });

  const findOne = jest.fn(async (filter = {}) => {
    if (filter['payment.idempotencyKey']) {
      return (
        orders.find((order) => order.payment?.idempotencyKey === filter['payment.idempotencyKey']) || null
      );
    }
    return null;
  });

  const findById = jest.fn(async (id) => {
    return orders.find((order) => order._id === id) || null;
  });

  return {
    create,
    find,
    findById,
    findOne,
    __orders: orders,
  };
});

const { notifyUser } = require('../services/notificationService');
const Order = require('../models/Order');
const Shop = require('../models/Shop');
const Product = require('../models/Product');
const orderRoutes = require('../routes/orderRoutes');
const contextMiddleware = require('../middleware/context');
const errorMiddleware = require('../middleware/error');

const buildApp = () => {
  const app = express();
  app.use(express.json());
  app.use(contextMiddleware);
  app.use('/orders', orderRoutes);
  app.use(errorMiddleware);
  return app;
};

describe('orders API flow', () => {
  let app;

  beforeAll(() => {
    app = buildApp();
  });

  beforeEach(() => {
    Order.__orders.length = 0;
    Order.create.mockClear();
    Order.find.mockClear();
    Order.findById.mockClear();
    Order.findOne.mockClear();
    Product.find.mockClear?.();
    Shop.findById.mockClear?.();
    Shop.find.mockClear?.();
    notifyUser.mockClear();

    productDocs = [
      {
        _id: 'prod-1',
        shop: 'shop-1',
        name: 'Masala Dosa',
        price: 120,
        image: null,
        sku: 'SKU-1',
        category: 'Food',
      },
    ];
    shopRecord = {
      _id: 'shop-1',
      owner: 'owner-1',
      name: 'Udupi Cafe',
      location: 'MG Road',
      address: 'MG Road',
    };
    mockUser = {
      _id: 'user-1',
      name: 'Alice',
      phone: '9999999999',
      role: 'user',
      location: 'MG Road',
      address: 'MG Road',
    };
  });

  it('creates an order with pending status and lists it under /orders/mine', async () => {
    const createResponse = await request(app)
      .post('/orders')
      .send({
        shopId: 'shop-1',
        items: [{ productId: 'prod-1', quantity: 2 }],
        fulfillment: { type: 'pickup' },
        notes: 'Extra chutney',
      });

    expect(createResponse.status).toBe(201);
    expect(createResponse.body.ok).toBe(true);
    expect(Order.create).toHaveBeenCalledTimes(1);

    const payload = Order.create.mock.calls[0][0];
    expect(payload.status).toBe('pending');
    expect(payload.itemsTotal).toBe(24000);
    expect(payload.grandTotal).toBe(24000);
    expect(payload.items[0]).toEqual(
      expect.objectContaining({ qty: 2, unitPrice: 12000, subtotal: 24000 }),
    );

    const listResponse = await request(app).get('/orders/mine');
    expect(listResponse.status).toBe(200);
    expect(listResponse.body.ok).toBe(true);
    expect(listResponse.body.data.items).toHaveLength(1);
    expect(listResponse.body.data.items[0].status).toBe('pending');
  });

  it('splits checkout payloads into per-shop orders with paise totals', async () => {
    productDocs = [
      {
        _id: 'prod-1',
        shop: 'shop-1',
        name: 'Masala Dosa',
        price: 120,
      },
      {
        _id: 'prod-2',
        shop: 'shop-2',
        name: 'Idli',
        price: 80,
      },
    ];

    const shopMap = {
      'shop-1': {
        _id: 'shop-1',
        owner: 'owner-1',
        name: 'Udupi Cafe',
        location: 'MG Road',
        address: 'MG Road',
      },
      'shop-2': {
        _id: 'shop-2',
        owner: 'owner-2',
        name: 'SLV',
        location: 'Brigade Road',
        address: 'Brigade Road',
      },
    };

    const defaultImpl = Shop.findById.getMockImplementation();
    Shop.findById.mockImplementation((id) => ({
      lean: jest.fn().mockResolvedValue(shopMap[id] ?? shopRecord),
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue(
          shopMap[id] ? { owner: shopMap[id].owner } : { owner: shopRecord?.owner },
        ),
      }),
    }));

    const response = await request(app)
      .post('/orders/checkout')
      .set('Idempotency-Key', 'checkout-123')
      .send({
        items: [
          { productId: 'prod-1', qty: 2 },
          { productId: 'prod-2', qty: 1 },
        ],
        shippingAddress: {
          name: 'Alice',
          address1: 'MG Road',
          city: 'Bengaluru',
          state: 'KA',
          pincode: '560001',
        },
        paymentMethod: 'COD',
      });

    expect(response.status).toBe(201);
    expect(response.body.ok).toBe(true);
    expect(response.body.data.orders).toHaveLength(2);
    expect(Order.create).toHaveBeenCalledTimes(2);

    const payloads = Order.create.mock.calls.map(([payload]) => payload);
    expect(payloads).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ shop: 'shop-1', itemsTotal: 24000, grandTotal: 24000 }),
        expect.objectContaining({ shop: 'shop-2', itemsTotal: 8000, grandTotal: 8000 }),
      ]),
    );

    Shop.findById.mockImplementation(
      defaultImpl || ((id) => ({
        lean: jest.fn().mockResolvedValue(shopRecord),
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue({ owner: shopRecord?.owner }),
        }),
      })),
    );
  });

  it('allows the shop owner to accept the order and updates the status timeline', async () => {
    await request(app)
      .post('/orders')
      .send({
        shopId: 'shop-1',
        items: [{ productId: 'prod-1', quantity: 1 }],
        fulfillment: { type: 'pickup' },
      })
      .expect(201);

    const [order] = Order.__orders;
    expect(order.status).toBe('pending');

    mockUser = { _id: 'owner-1', name: 'Shop Owner', phone: '8888888888', role: 'user' };

    const patchResponse = await request(app)
      .patch(`/orders/${order._id}/status`)
      .send({ status: 'accepted', note: 'Ready soon' });

    expect(patchResponse.status).toBe(200);
    expect(patchResponse.body.ok).toBe(true);
    expect(patchResponse.body.data.order.status).toBe('accepted');
    expect(order.timeline.at(-1)).toEqual(
      expect.objectContaining({ status: 'accepted', note: 'Ready soon' }),
    );

    mockUser = {
      _id: 'user-1',
      name: 'Alice',
      phone: '9999999999',
      role: 'user',
      location: 'MG Road',
      address: 'MG Road',
    };
    const mineResponse = await request(app).get('/orders/mine');
    expect(mineResponse.body.data.items[0].status).toBe('accepted');
  });

  it('rejects status updates from non-owners', async () => {
    await request(app)
      .post('/orders')
      .send({
        shopId: 'shop-1',
        items: [{ productId: 'prod-1', quantity: 1 }],
        fulfillment: { type: 'pickup' },
      })
      .expect(201);

    const [order] = Order.__orders;
    mockUser = { _id: 'user-2', name: 'Eve', phone: '7777777777', role: 'user' };

    const patchResponse = await request(app)
      .patch(`/orders/${order._id}/status`)
      .send({ status: 'accepted' });

    expect(patchResponse.status).toBe(403);
    expect(patchResponse.body.ok).toBe(false);
    expect(order.status).toBe('pending');
  });
});
