import { getAllShops, getProductsByShop } from '../controllers/shopController';
import Shop from '../models/Shop';
import Product from '../models/Product';
import { normalizeProduct } from '../utils/normalize';

jest.mock('../utils/normalize', () => ({
  normalizeProduct: jest.fn((p) => p),
}));

describe('shop flows', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('lists shops with filters, sort and pagination', async () => {
    const createdAt = new Date();
    const items = [
      {
        _id: '1',
        name: 'Alpha',
        ownerName: 'Owner',
        category: 'general',
        location: 'City',
        status: 'approved',
        productsCount: 2,
        createdAt,
      },
    ];
    const aggregate = jest
      .spyOn(Shop, 'aggregate')
      .mockResolvedValueOnce(items)
      .mockResolvedValueOnce([{ total: 1 }]);

    const req: any = {
      query: { q: 'Alpha', status: 'active', page: '1', pageSize: '10', sort: '-createdAt' },
    };
    const json = jest.fn();
    await getAllShops(req, { json } as any);
    expect(aggregate).toHaveBeenCalledTimes(2);
    expect(json).toHaveBeenCalledWith({
      items: [
        {
          id: '1',
          _id: '1',
          name: 'Alpha',
          owner: 'Owner',
          category: 'general',
          location: 'City',
          status: 'active',
          productsCount: 2,
          createdAt,
        },
      ],
      total: 1,
    });
  });

  it('queries products for shop with pagination', async () => {
    const products = [
      { _id: 'p1', name: 'Prod', shop: { _id: 's1', name: 'Alpha', image: '', location: 'City' } },
    ];
    const query: any = Promise.resolve(products);
    query.populate = jest.fn().mockReturnThis();
    query.skip = jest.fn().mockReturnThis();
    query.limit = jest.fn().mockResolvedValue(products);
    jest.spyOn(Product, 'find').mockReturnValue(query);

    const req: any = { params: { id: 's1' }, query: { page: '2', limit: '1' } };
    const json = jest.fn();
    await getProductsByShop(req, { json } as any);
    expect(query.skip).toHaveBeenCalledWith(1);
    expect(query.limit).toHaveBeenCalledWith(1);
    expect(json).toHaveBeenCalledWith(products);
  });
});
