const request = require('supertest');
const express = require('express');

jest.mock('../middleware/authMiddleware', () =>
  jest.fn((req, _res, next) => {
    req.user = { _id: 'user-1', role: 'business' };
    next();
  })
);

jest.mock('../models/Shop', () => ({
  findOne: jest.fn(),
}));

jest.mock('../models/Product', () => ({
  create: jest.fn(),
}));

const Shop = require('../models/Shop');
const Product = require('../models/Product');
const productRoutes = require('../routes/productRoutes');

const buildApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/products', productRoutes);
  return app;
};

describe('POST /products', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates a product and returns normalized payload', async () => {
    Shop.findOne.mockResolvedValue({ _id: 'shop-1', owner: 'user-1', location: 'City' });
    Product.create.mockResolvedValue({
      _id: 'prod-1',
      shop: 'shop-1',
      name: 'Apple',
      description: 'Fresh',
      price: 123.45,
      mrp: 150,
      images: ['https://img'],
      image: 'https://img',
      category: 'Fruits',
      stock: 5,
    });

    const payload = {
      shopId: 'shop-1',
      name: 'Apple',
      description: 'Fresh',
      pricePaise: 12345,
      mrpPaise: 15000,
      category: 'Fruits',
      imageUrl: 'https://img',
      stock: 5,
    };

    const app = buildApp();
    const res = await request(app).post('/products').send(payload);

    expect(res.status).toBe(201);
    expect(Product.create).toHaveBeenCalledWith(
      expect.objectContaining({ price: 123.45, mrp: 150, images: ['https://img'], stock: 5 })
    );
    expect(res.body.ok).toBe(true);
    expect(res.body.data.product.price).toBe(123.45);
    expect(res.body.data.product.pricePaise).toBe(12345);
    expect(res.body.data.product.shopId).toBe('shop-1');
  });

  it('rejects invalid price payload', async () => {
    Shop.findOne.mockResolvedValue({ _id: 'shop-1', owner: 'user-1', location: 'City' });
    const app = buildApp();
    const res = await request(app)
      .post('/products')
      .send({
        shopId: 'shop-1',
        name: 'Apple',
        category: 'Fruits',
        pricePaise: 10.5,
        mrpPaise: 100,
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
    expect(Product.create).not.toHaveBeenCalled();
  });
});
