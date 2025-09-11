const Order = require('../models/Order');
const User = require('../models/User');
const AppError = require('../utils/appError');

// POST /api/orders - create order from cart
exports.createOrder = async (req, res, next) => {
  try {
    const { type = 'product', targetId, items } = req.body;
    if (!targetId || !Array.isArray(items) || items.length === 0) {
      throw AppError.badRequest('INVALID_ORDER', 'Invalid order payload');
    }

    const subtotal = items.reduce(
      (sum, item) => sum + Number(item.price) * Number(item.quantity),
      0
    );
    const discount = items.reduce(
      (sum, item) => sum + Number(item.discount || 0),
      0
    );
    const total = subtotal - discount;

    const order = await Order.create({
      type,
      customerId: req.user._id,
      targetId,
      items: items.map((i) => ({
        productId: i.productId,
        name: i.name,
        image: i.image,
        price: i.price,
        quantity: i.quantity,
        total: Number(i.price) * Number(i.quantity),
      })),
      totals: { subtotal, discount, total },
    });

    res.status(201).json({
      ok: true,
      data: { order },
      traceId: req.traceId,
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/orders/mine - current user's orders
exports.getMyOrders = async (req, res, next) => {
  try {
    const orders = await Order.find({ customerId: req.user._id })
      .sort({ createdAt: -1 })
      .lean();
    res.json({ ok: true, data: orders, traceId: req.traceId });
  } catch (err) {
    next(err);
  }
};

// GET /api/orders/received - orders for business user
exports.getReceivedOrders = async (req, res, next) => {
  try {
    const orders = await Order.find({ targetId: req.user._id })
      .sort({ createdAt: -1 })
      .populate('customerId', 'name phone')
      .lean();

    orders.forEach((o) => {
      if (o.status !== 'accepted' && o.customerId) {
        delete o.customerId.phone;
      }
    });

    res.json({ ok: true, data: orders, traceId: req.traceId });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/orders/:id - update order status
exports.updateOrderStatus = async (req, res, next) => {
  try {
    const { action } = req.body;
    const order = await Order.findById(req.params.id)
      .populate('customerId', 'name phone')
      .lean();
    if (!order) throw AppError.notFound('ORDER_NOT_FOUND', 'Order not found');

    // Permission checks
    const isCustomer = order.customerId._id
      ? order.customerId._id.toString() === req.user._id.toString()
      : order.customerId.toString() === req.user._id.toString();
    const isTarget = order.targetId.toString() === req.user._id.toString();

    if (action === 'accept') {
      if (!isTarget)
        throw AppError.forbidden('NOT_AUTHORIZED', 'Not authorized');
      const updated = await Order.findByIdAndUpdate(
        req.params.id,
        { status: 'accepted', contactSharedAt: new Date() },
        { new: true }
      ).populate('customerId', 'name phone');
      return res.json({ ok: true, data: updated, traceId: req.traceId });
    }

    if (action === 'reject') {
      if (!isTarget)
        throw AppError.forbidden('NOT_AUTHORIZED', 'Not authorized');
      const updated = await Order.findByIdAndUpdate(
        req.params.id,
        { status: 'cancelled' },
        { new: true }
      ).populate('customerId', 'name phone');
      return res.json({ ok: true, data: updated, traceId: req.traceId });
    }

    if (action === 'complete') {
      if (!isTarget)
        throw AppError.forbidden('NOT_AUTHORIZED', 'Not authorized');
      const updated = await Order.findByIdAndUpdate(
        req.params.id,
        { status: 'completed' },
        { new: true }
      ).populate('customerId', 'name phone');
      return res.json({ ok: true, data: updated, traceId: req.traceId });
    }

    if (action === 'cancel') {
      if (!isCustomer)
        throw AppError.forbidden('NOT_AUTHORIZED', 'Not authorized');
      const updated = await Order.findByIdAndUpdate(
        req.params.id,
        { status: 'cancelled' },
        { new: true }
      ).populate('customerId', 'name phone');
      return res.json({ ok: true, data: updated, traceId: req.traceId });
    }

    throw AppError.badRequest('INVALID_ACTION', 'Unknown action');
  } catch (err) {
    next(err);
  }
};

