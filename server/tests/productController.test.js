const Product = require('../models/Product');
const Shop = require('../models/Shop');
const { normalizeProduct } = require('../utils/normalize');
const { createProduct, updateProduct } = require('../controllers/productController');

jest.mock('../models/Product', () => ({
  create: jest.fn(),
  findOne: jest.fn(),
}));

jest.mock('../models/Shop', () => ({
  findOne: jest.fn(),
}));

jest.mock('../utils/normalize', () => ({
  normalizeProduct: jest.fn(),
}));

describe('productController.createProduct', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates a product with paise payload and returns normalized response', async () => {
    Shop.findOne.mockResolvedValue({ _id: 'shop-1', owner: 'user-1', location: 'City' });
    const createdDoc = {
      _id: 'prod-1',
      price: 123.45,
      mrp: 150,
      images: ['https://img'],
      image: 'https://img',
      category: 'Fruits',
      description: 'Fresh',
      stock: 5,
      shop: 'shop-1',
    };
    Product.create.mockResolvedValue(createdDoc);
    normalizeProduct.mockReturnValue({
      _id: 'prod-1',
      shopId: 'shop-1',
      price: 123.45,
      pricePaise: 12345,
    });

    const req = {
      body: {
        shopId: 'shop-1',
        name: 'Apple',
        description: 'Fresh',
        pricePaise: 12345,
        mrpPaise: 15000,
        category: 'Fruits',
        imageUrl: 'https://img',
        stock: 5,
      },
      user: { _id: 'user-1' },
    };
    const json = jest.fn();
    const res = { status: jest.fn(() => res), json };

    await createProduct(req, res, jest.fn());

    expect(Shop.findOne).toHaveBeenCalledWith({ _id: 'shop-1', owner: 'user-1' });
    expect(Product.create).toHaveBeenCalledWith(
      expect.objectContaining({
        shop: 'shop-1',
        price: 123.45,
        mrp: 150,
        images: ['https://img'],
        stock: 5,
      })
    );
    expect(res.status).toHaveBeenCalledWith(201);
    expect(json).toHaveBeenCalledWith({
      ok: true,
      data: { product: { _id: 'prod-1', shopId: 'shop-1', price: 123.45, pricePaise: 12345 } },
    });
  });
});


describe('productController.updateProduct stock aliases', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('updates stock when quantity alias is provided', async () => {
    const save = jest.fn().mockResolvedValue(undefined);
    Product.findOne.mockResolvedValue({
      _id: 'prod-1',
      shop: 'shop-1',
      price: 100,
      mrp: 120,
      stock: 1,
      save,
    });
    Shop.findOne.mockResolvedValue({ _id: 'shop-1', owner: 'user-1', location: 'City' });
    normalizeProduct.mockReturnValue({ _id: 'prod-1', stock: 10, stock_quantity: 10 });

    const req = {
      params: { id: 'prod-1' },
      body: { quantity: 10 },
      user: { _id: 'user-1', role: 'business' },
    };
    const json = jest.fn();
    const res = { json, status: jest.fn(() => res) };

    await updateProduct(req, res, jest.fn());

    expect(save).toHaveBeenCalled();
    expect(json).toHaveBeenCalledWith({ ok: true, data: { product: { _id: 'prod-1', stock: 10, stock_quantity: 10 } } });
  });

  it('returns PRODUCT_STOCK_INVALID for negative stock alias', async () => {
    Product.findOne.mockResolvedValue({
      _id: 'prod-1',
      shop: 'shop-1',
      price: 100,
      mrp: 120,
      stock: 1,
      save: jest.fn(),
    });
    Shop.findOne.mockResolvedValue({ _id: 'shop-1', owner: 'user-1', location: 'City' });

    const req = {
      params: { id: 'prod-1' },
      body: { stockQuantity: -2 },
      user: { _id: 'user-1', role: 'business' },
    };
    const json = jest.fn();
    const res = { json, status: jest.fn(() => res) };

    await updateProduct(req, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith({ error: 'PRODUCT_STOCK_INVALID' });
  });
});
