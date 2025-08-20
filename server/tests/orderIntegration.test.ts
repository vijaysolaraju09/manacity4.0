import Order from '../models/Order';
import { getMyOrders, getReceivedOrders, acceptOrder } from '../controllers/orderController';
import { normalizeProduct } from '../utils/normalize';

jest.mock('../utils/normalize', () => ({
  normalizeProduct: jest.fn((p) => p),
}));

describe('order flows', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('filters orders and hides phone until accepted', async () => {
    const orders = [
      {
        status: 'pending',
        user: { name: 'Alice', phone: '111' },
        product: { name: 'Apple', price: 10 },
        toObject() { return this; },
      },
      {
        status: 'accepted',
        user: { name: 'Bob', phone: '222' },
        product: { name: 'Banana', price: 20 },
        toObject() { return this; },
      },
    ];
    const query: any = Promise.resolve(orders);
    query.populate = jest.fn().mockReturnThis();
    query.where = jest.fn().mockReturnThis();
    query.equals = jest.fn().mockReturnThis();
    query.skip = jest.fn().mockReturnThis();
    query.limit = jest.fn().mockReturnThis();
    jest.spyOn(Order, 'find').mockReturnValue(query);

    const req: any = { user: { _id: 'u1' }, query: {} };
    const json = jest.fn();
    await getReceivedOrders(req, { json } as any);
    const result = json.mock.calls[0][0];
    expect(result[0].user.phone).toBeUndefined();
    expect(result[1].user.phone).toBe('222');
  });

  it('filters my orders by status', async () => {
    const orders = [
      { status: 'pending', shop: { name: 'Shop A' }, product: {}, toObject() { return this; } },
    ];
    const query: any = Promise.resolve(orders);
    query.populate = jest.fn().mockReturnThis();
    query.where = jest.fn().mockReturnThis();
    query.equals = jest.fn().mockReturnThis();
    query.skip = jest.fn().mockReturnThis();
    query.limit = jest.fn().mockReturnThis();
    jest.spyOn(Order, 'find').mockReturnValue(query);

    const req: any = { user: { _id: 'u1' }, query: { status: 'pending' } };
    const json = jest.fn();
    await getMyOrders(req, { json } as any);
    expect(Order.find).toHaveBeenCalledWith({ user: 'u1' });
    expect(query.where).toHaveBeenCalledWith('status');
    expect(query.equals).toHaveBeenCalledWith('pending');
  });

  it('reveals phone on accept', async () => {
    const order: any = {
      business: 'b1',
      user: { name: 'Bob', phone: '999' },
      status: 'pending',
      save: jest.fn(),
    };
    jest.spyOn(Order, 'findById').mockResolvedValue(order);
    const req: any = { params: { id: 'o1' }, user: { _id: 'b1' } };
    const json = jest.fn();
    await acceptOrder(req, { json } as any);
    expect(order.status).toBe('accepted');
    expect(json).toHaveBeenCalledWith(order);
  });
});
