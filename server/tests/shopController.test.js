const Shop = require('../models/Shop');
const Product = require('../models/Product');
const ctrl = require('../controllers/shopsController');

describe('shops controller', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('lists shops', async () => {
    const lean = jest.fn().mockResolvedValue([{ name: 'A' }]);
    jest.spyOn(Shop, 'find').mockReturnValue({ lean });
    const req = { traceId: 't' };
    const json = jest.fn();
    await ctrl.getAllShops(req, { json });
    expect(Shop.find).toHaveBeenCalledWith({});
    expect(json).toHaveBeenCalledWith({ ok: true, data: { items: [{ name: 'A' }] }, traceId: 't' });
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
