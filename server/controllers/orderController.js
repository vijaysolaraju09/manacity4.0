const Order = require('../models/Order');
const Product = require('../models/Product');
const Shop = require('../models/Shop');
const AppError = require('../utils/AppError');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const allowedTransitions = {
  placed: ['confirmed', 'cancelled'],
  confirmed: ['preparing', 'cancelled'],
  preparing: ['ready', 'cancelled'],
  ready: ['out_for_delivery', 'cancelled'],
  out_for_delivery: ['delivered', 'cancelled'],
  delivered: ['returned'],
  cancelled: [],
  returned: [],
};

function toPaise(value) {
  return Math.round(Number(value) * 100);
}

// ---------------------------------------------------------------------------
// Create Order
// ---------------------------------------------------------------------------
exports.createOrder = async (req, res, next) => {
  try {
    const { shopId, items, fulfillment, shippingAddress, notes, payment } = req.body;
    if (!shopId || !Array.isArray(items) || items.length === 0) {
      throw AppError.badRequest('INVALID_ORDER', 'Invalid order payload');
    }
    if (!fulfillment || !fulfillment.type) {
      throw AppError.badRequest('INVALID_FULFILLMENT', 'Fulfillment type required');
    }

    const idempotencyKey = req.get('Idempotency-Key');
    if (idempotencyKey) {
      const existing = await Order.findOne({ 'payment.idempotencyKey': idempotencyKey });
      if (existing) {
        return res.status(200).json({ ok: true, data: { order: existing }, traceId: req.traceId });
      }
    }

    const shop = await Shop.findById(shopId).lean();
    if (!shop) throw AppError.notFound('SHOP_NOT_FOUND', 'Shop not found');

    const productIds = items.map((i) => i.productId);
    const products = await Product.find({ _id: { $in: productIds }, shop: shopId }).lean();
    const productMap = new Map(products.map((p) => [p._id.toString(), p]));

    const orderItems = [];
    let itemsTotal = 0;
    for (const i of items) {
      const p = productMap.get(i.productId);
      if (!p) throw AppError.badRequest('PRODUCT_NOT_FOUND', 'Product not found');
      const unitPrice = toPaise(p.price);
      const qty = Number(i.qty);
      const subtotal = unitPrice * qty;
      itemsTotal += subtotal;
      orderItems.push({
        product: p._id,
        productSnapshot: {
          name: p.name,
          image: p.image,
          sku: p.sku,
          category: p.category,
        },
        unitPrice,
        qty,
        subtotal,
        options: i.options || {},
      });
    }

    const discountTotal = 0;
    const taxTotal = 0;
    const shippingFee = 0;
    const grandTotal = itemsTotal - discountTotal + taxTotal + shippingFee;

    const order = await Order.create({
      shop: shop._id,
      shopSnapshot: {
        name: shop.name,
        location: shop.location,
        address: shop.address,
      },
      user: req.user._id,
      userSnapshot: {
        name: req.user.name,
        phone: req.user.phone,
        location: req.user.location,
        address: req.user.address,
      },
      items: orderItems,
      notes,
      status: 'placed',
      fulfillment,
      shippingAddress,
      currency: 'INR',
      itemsTotal,
      discountTotal,
      taxTotal,
      shippingFee,
      grandTotal,
      payment: {
        method: payment?.method || 'cod',
        status: 'pending',
        idempotencyKey,
      },
      timeline: [
        {
          at: new Date(),
          by: 'system',
          status: 'placed',
          note: 'Order placed',
        },
      ],
    });

    res.status(201).json({ ok: true, data: { order }, traceId: req.traceId });
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------------
// Get current user's orders
// ---------------------------------------------------------------------------
exports.getMyOrders = async (req, res, next) => {
  try {
    const { status, page = 1, pageSize = 20 } = req.query;
    const query = Order.find({ user: req.user._id });
    if (status) query.where('status').equals(status);
    const orders = await query
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(pageSize))
      .limit(Number(pageSize))
      .lean();
    res.json({ ok: true, data: { items: orders }, traceId: req.traceId });
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------------
// Get orders received by shops owned by user
// ---------------------------------------------------------------------------
exports.getReceivedOrders = async (req, res, next) => {
  try {
    const { status, page = 1, pageSize = 20 } = req.query;
    const shops = await Shop.find({ owner: req.user._id }).select('_id').lean();
    const shopIds = shops.map((s) => s._id);
    const query = Order.find({ shop: { $in: shopIds } });
    if (status) query.where('status').equals(status);
    const orders = await query
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(pageSize))
      .limit(Number(pageSize))
      .lean();
    res.json({ ok: true, data: { items: orders }, traceId: req.traceId });
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------------
// Get order by id
// ---------------------------------------------------------------------------
exports.getOrderById = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id).lean();
    if (!order) throw AppError.notFound('ORDER_NOT_FOUND', 'Order not found');
    const shop = await Shop.findById(order.shop).select('owner').lean();
    const isOwner = order.user.toString() === req.user._id.toString();
    const isShopOwner = shop && shop.owner.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';
    if (!isOwner && !isShopOwner && !isAdmin) {
      throw AppError.forbidden('NOT_AUTHORIZED', 'Not authorized');
    }
    res.json({ ok: true, data: { order }, traceId: req.traceId });
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------------
// Update order status
// ---------------------------------------------------------------------------
exports.updateOrderStatus = async (req, res, next) => {
  try {
    const { status, note } = req.body;
    const order = await Order.findById(req.params.id);
    if (!order) throw AppError.notFound('ORDER_NOT_FOUND', 'Order not found');
    const shop = await Shop.findById(order.shop).select('owner').lean();
    const isShopOwner = shop && shop.owner.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';
    if (!isShopOwner && !isAdmin) {
      throw AppError.forbidden('NOT_AUTHORIZED', 'Not authorized');
    }
    const allowed = allowedTransitions[order.status] || [];
    if (!allowed.includes(status)) {
      throw AppError.badRequest('INVALID_STATUS', 'Invalid status transition');
    }
    order.status = status;
    order.timeline.push({
      at: new Date(),
      by: isAdmin ? 'admin' : 'shop',
      status,
      note,
    });
    await order.save();
    res.json({ ok: true, data: { order }, traceId: req.traceId });
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------------
// Cancel order by customer
// ---------------------------------------------------------------------------
exports.cancelOrder = async (req, res, next) => {
  try {
    const { reason } = req.body;
    const order = await Order.findById(req.params.id);
    if (!order) throw AppError.notFound('ORDER_NOT_FOUND', 'Order not found');
    if (order.user.toString() !== req.user._id.toString()) {
      throw AppError.forbidden('NOT_AUTHORIZED', 'Not authorized');
    }
    const cancellable = ['placed', 'confirmed', 'preparing'];
    if (!cancellable.includes(order.status)) {
      throw AppError.badRequest('NOT_ALLOWED', 'Cannot cancel at this stage');
    }
    order.status = 'cancelled';
    order.cancel = { by: 'user', reason, at: new Date() };
    order.timeline.push({ at: new Date(), by: 'user', status: 'cancelled', note: reason });
    await order.save();
    res.json({ ok: true, data: { order }, traceId: req.traceId });
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------------
// Rate order
// ---------------------------------------------------------------------------
exports.rateOrder = async (req, res, next) => {
  try {
    const { rating, review } = req.body;
    const order = await Order.findById(req.params.id);
    if (!order) throw AppError.notFound('ORDER_NOT_FOUND', 'Order not found');
    if (order.user.toString() !== req.user._id.toString()) {
      throw AppError.forbidden('NOT_AUTHORIZED', 'Not authorized');
    }
    if (order.status !== 'delivered') {
      throw AppError.badRequest('NOT_DELIVERED', 'Order not delivered yet');
    }
    order.rating = rating;
    order.review = review;
    await order.save();
    res.json({ ok: true, data: { order }, traceId: req.traceId });
  } catch (err) {
    next(err);
  }
};

