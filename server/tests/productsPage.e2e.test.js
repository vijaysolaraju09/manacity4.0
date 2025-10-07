const express = require('express');
const request = require('supertest');

jest.mock('../models/Product', () => ({
  find: jest.fn(),
}));

const Product = require('../models/Product');
const productRoutes = require('../routes/productRoutes');

const buildApp = () => {
  const app = express();
  app.use('/products', productRoutes);
  return app;
};

describe('GET /products', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns normalized products for the products listing page', async () => {
    const mockProducts = [
      {
        _id: 'prod-1',
        name: 'Golden Mango',
        description: 'Juicy alphonso mangoes',
        price: 120,
        mrp: 150,
        images: ['https://img/mango.jpg'],
        category: 'Fruits',
        stock: 5,
        shop: { _id: 'shop-1', name: 'Fresh Cart', image: null, location: 'Bangalore' },
        updatedAt: new Date('2024-02-02T10:00:00Z'),
      },
      {
        _id: 'prod-2',
        name: 'Herbal Tea',
        description: 'Relaxing infusion',
        price: 60,
        mrp: 80,
        images: ['https://img/tea.jpg'],
        category: 'Beverages',
        stock: 10,
        shop: { _id: 'shop-2', name: 'Wellness Hub', image: null, location: 'Mysuru' },
        updatedAt: new Date('2024-02-01T09:30:00Z'),
      },
    ];
    const populate = jest.fn().mockReturnThis();
    const lean = jest.fn().mockResolvedValue(mockProducts);
    Product.find.mockReturnValue({ populate, lean });

    const app = buildApp();
    const res = await request(app).get('/products');

    expect(res.status).toBe(200);
    expect(Product.find).toHaveBeenCalledWith({ isDeleted: false });
    expect(populate).toHaveBeenCalledWith('shop', 'name image location');
    expect(res.body).toHaveLength(2);
    expect(res.body[0]).toEqual(
      expect.objectContaining({
        _id: 'prod-1',
        name: 'Golden Mango',
        price: 120,
        mrp: 150,
        discount: 20,
        category: 'Fruits',
        shopId: 'shop-1',
        shopMeta: expect.objectContaining({ name: 'Fresh Cart' }),
      })
    );
  });

  it('applies query filters when fetching products', async () => {
    const populate = jest.fn().mockReturnThis();
    const lean = jest.fn().mockResolvedValue([]);
    Product.find.mockReturnValue({ populate, lean });

    const app = buildApp();
    await request(app)
      .get('/products')
      .query({ query: 'tea', category: 'Beverages', shopId: 'shop-2' });

    expect(Product.find).toHaveBeenCalledWith(
      expect.objectContaining({
        isDeleted: false,
        category: 'Beverages',
        shop: 'shop-2',
        name: { $regex: 'tea', $options: 'i' },
      })
    );
  });
});
