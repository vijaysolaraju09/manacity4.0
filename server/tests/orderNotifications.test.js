const mongoose = require('mongoose');

jest.mock('../models/Order');
jest.mock('../models/Shop');
jest.mock('../services/notificationService', () => ({ notifyUser: jest.fn() }));

const Order = require('../models/Order');
const Shop = require('../models/Shop');
const { notifyUser } = require('../services/notificationService');
const { updateOrderStatus } = require('../controllers/orderController');

Order.findById = jest.fn();
Shop.findById = jest.fn();

const ownerId = new mongoose.Types.ObjectId();
const userId = new mongoose.Types.ObjectId();

const buildShopQuery = (owner = ownerId) => {
  const query = {
    select: jest.fn().mockReturnThis(),
    lean: jest.fn().mockResolvedValue({ owner }),
  };
  return query;
};

const buildOrder = (status) => ({
  _id: new mongoose.Types.ObjectId(),
  status,
  user: userId,
  shop: new mongoose.Types.ObjectId(),
  timeline: [],
  save: jest.fn().mockResolvedValue(),
});

describe('order notifications', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it.each([
    { current: 'accepted', next: 'preparing' },
    { current: 'preparing', next: 'delivered' },
    { current: 'delivered', next: 'completed' },
    { current: 'preparing', next: 'cancelled', note: 'Out of stock' },
  ])('notifies the customer when status changes from %s to %s', async ({ current, next, note }) => {
    const order = buildOrder(current);
    Order.findById.mockResolvedValue(order);
    Shop.findById.mockReturnValue(buildShopQuery());

    const req = {
      params: { id: order._id.toString() },
      body: { status: next, note },
      user: { _id: ownerId, role: 'owner' },
    };
    const res = { json: jest.fn() };
    const nextFn = jest.fn();

    await updateOrderStatus(req, res, nextFn);

    expect(notifyUser).toHaveBeenCalledWith(
      userId,
      expect.objectContaining({
        message: expect.stringMatching(new RegExp(next, 'i')),
        redirectUrl: `/orders/${order._id.toString()}`,
        targetId: order._id,
        targetType: 'order',
        resourceId: order._id,
        resourceType: 'order',
      }),
    );
    expect(res.json).toHaveBeenCalled();
    expect(nextFn).not.toHaveBeenCalled();
  });
});
