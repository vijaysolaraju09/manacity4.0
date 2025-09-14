const Shop = require('../models/Shop');
const Product = require('../models/Product');
const ctrl = require('../controllers/shopsController');

describe('shops controller', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('lists shops', async () => {
    const shopDoc = { toCardJSON: () => ({ name: 'A' }) };
    const limit = jest.fn().mockResolvedValue([shopDoc]);
    const skip = jest.fn().mockReturnValue({ limit });
    const sort = jest.fn().mockReturnValue({ skip });
    jest.spyOn(Shop, 'find').mockReturnValue({ sort });
    jest.spyOn(Shop, 'countDocuments').mockResolvedValue(1);
    const req = { traceId: 't', query: {} };
    const json = jest.fn();
    await ctrl.getAllShops(req, { json });
    expect(Shop.find).toHaveBeenCalledWith({});
    expect(json).toHaveBeenCalledWith({
      ok: true,
      data: { items: [{ name: 'A' }], total: 1, page: 1, pageSize: 10 },
      traceId: 't',
    });
  });

  it('lists products by shop', async () => {
    const lean = jest.fn().mockResolvedValue([{ name: 'P' }]);
    jest.spyOn(Product, 'find').mockReturnValue({ lean });
    const req = { params: { id: '1' }, traceId: 't' };
    const json = jest.fn();
    await ctrl.getProductsByShop(req, { json });
    expect(Product.find).toHaveBeenCalledWith({ shop: '1', isDeleted: false });
    expect(json).toHaveBeenCalledWith({ ok: true, data: { items: [{ name: 'P' }] }, traceId: 't' });
  });
});
