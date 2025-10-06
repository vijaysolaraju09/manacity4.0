const Product = require('../models/Product');
const Shop = require('../models/Shop');
const { normalizeProduct } = require('../utils/normalize');
const { createProduct } = require('../controllers/productController');

jest.mock('../models/Product', () => ({
  create: jest.fn(),
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
