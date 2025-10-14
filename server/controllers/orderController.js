const Order = require('../models/Order');
const Product = require('../models/Product');
const Shop = require('../models/Shop');
const AppError = require('../utils/AppError');
const { notifyUser } = require('../services/notificationService');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const allowedTransitions = {
  draft: ['pending', 'cancelled'],
  pending: ['accepted', 'cancelled'],
  accepted: ['confirmed', 'preparing', 'cancelled'],
  placed: ['accepted', 'confirmed', 'cancelled'],
  confirmed: ['preparing', 'cancelled'],
  preparing: ['ready', 'cancelled'],
  ready: ['out_for_delivery', 'cancelled'],
  out_for_delivery: ['delivered', 'cancelled'],
  delivered: ['completed', 'returned'],
  completed: [],
  cancelled: [],
  returned: [],
};

function toPaise(value) {
  return Math.round(Number(value) * 100);
}

const statusLabel = (status) =>
  String(status || '')
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

const orderCode = (order) =>
  (order?._id ? order._id.toString() : '')
    .slice(-6)
    .toUpperCase();

// ---------------------------------------------------------------------------
// Create Order
// ---------------------------------------------------------------------------
const sanitizeShippingAddress = (input) => {
  if (!input || typeof input !== 'object') return undefined;

  const value = input;
  const address1 = typeof value.address1 === 'string' ? value.address1.trim() : '';
  const address2 = typeof value.address2 === 'string' ? value.address2.trim() : '';
  const landmark = typeof value.landmark === 'string' ? value.landmark.trim() : '';
  const city = typeof value.city === 'string' ? value.city.trim() : '';
  const state = typeof value.state === 'string' ? value.state.trim() : '';
  const pincode = typeof value.pincode === 'string' ? value.pincode.trim() : '';
  const name = typeof value.name === 'string' ? value.name.trim() : '';
  const label = typeof value.label === 'string' ? value.label.trim() : '';
  const phone = typeof value.phone === 'string' ? value.phone.trim() : '';
  const referenceId = typeof value.referenceId === 'string' ? value.referenceId.trim() : '';

  const shipping = {};
  if (name) shipping.name = name;
  if (label) shipping.label = label;
  if (phone) shipping.phone = phone;
  if (address1) shipping.address1 = address1;
  if (address2) shipping.address2 = address2;
  if (landmark) shipping.landmark = landmark;
  if (city) shipping.city = city;
  if (state) shipping.state = state;
  if (pincode) shipping.pincode = pincode;
  if (referenceId) shipping.referenceId = referenceId;

  if (value.geo && typeof value.geo === 'object') {
    const lat = Number(value.geo.lat);
    const lng = Number(value.geo.lng);
    const geo = {};
    if (Number.isFinite(lat)) geo.lat = lat;
    if (Number.isFinite(lng)) geo.lng = lng;
    if (Object.keys(geo).length > 0) shipping.geo = geo;
  }

  return Object.keys(shipping).length > 0 ? shipping : undefined;
};

exports.createOrder = async (req, res, next) => {
  try {
    const {
      shopId,
      items,
      fulfillment,
      fulfillmentType,
      shippingAddress,
      addressId,
      notes,
      payment,
      paymentMethod,
    } = req.body;
    if (!shopId || !Array.isArray(items) || items.length === 0) {
      throw AppError.badRequest('INVALID_ORDER', 'Invalid order payload');
    }

    const desiredFulfillmentType =
      fulfillment?.type ||
      (typeof fulfillmentType === 'string' ? fulfillmentType : undefined) ||
      'delivery';

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
      if (!Number.isFinite(unitPrice) || unitPrice < 0) {
        throw AppError.badRequest('INVALID_PRODUCT_PRICE', 'Product price invalid');
      }
      const qty = Number(i.qty ?? i.quantity);
      if (!Number.isFinite(qty) || qty <= 0) {
        throw AppError.badRequest('INVALID_QTY', 'Quantity must be greater than zero');
      }
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

    let shippingAddressInput = sanitizeShippingAddress(shippingAddress);
    if (!shippingAddressInput && addressId) {
      const addresses = req.user?.addresses || [];
      const matched = Array.isArray(addresses)
        ? addresses.find((addr) =>
            [addr?._id, addr?.id]
              .filter(Boolean)
              .some((value) => value.toString() === String(addressId)),
          )
        : null;
      if (matched) {
        shippingAddressInput = sanitizeShippingAddress({
          name: matched.label,
          label: matched.label,
          address1: matched.line1,
          address2: matched.line2,
          city: matched.city,
          state: matched.state,
          pincode: matched.pincode,
          referenceId: addressId,
        });
      }
    }

    if (addressId && shippingAddressInput && !shippingAddressInput.referenceId) {
      shippingAddressInput.referenceId = addressId;
    }

    if (desiredFulfillmentType === 'delivery') {
      if (!shippingAddressInput || !shippingAddressInput.address1) {
        throw AppError.badRequest(
          'SHIPPING_ADDRESS_REQUIRED',
          'Delivery address required to place the order',
        );
      }
    }

    const paymentSource = paymentMethod || payment?.method || 'cod';
    const resolvedPaymentMethod =
      typeof paymentSource === 'string' && paymentSource.trim()
        ? paymentSource.trim().toLowerCase()
        : 'cod';

    const fulfillmentData =
      fulfillment && typeof fulfillment === 'object'
        ? { ...fulfillment, type: desiredFulfillmentType }
        : { type: desiredFulfillmentType };

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
      status: 'pending',
      fulfillment: fulfillmentData,
      shippingAddress: shippingAddressInput,
      currency: 'INR',
      itemsTotal,
      discountTotal,
      taxTotal,
      shippingFee,
      grandTotal,
      payment: {
        ...(payment && typeof payment === 'object' ? payment : {}),
        method: resolvedPaymentMethod,
        status:
          payment && typeof payment === 'object' && payment.status
            ? payment.status
            : 'pending',
        idempotencyKey,
      },
      timeline: [
        {
          at: new Date(),
          by: 'system',
          status: 'pending',
          note: 'Awaiting shop acceptance',
        },
      ],
    });

    const code = orderCode(order);
    await notifyUser(shop.owner, {
      type: 'order',
      message: `New order ${code || ''} from ${req.user.name || 'a customer'}.`,
    });
    await notifyUser(req.user._id, {
      type: 'order',
      message: `Your order ${code || ''} with ${shop.name} is awaiting shop acceptance.`,
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
    const shop = await Shop.findById(order.shop).select('owner name').lean();
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
    const code = orderCode(order);
    await notifyUser(order.user, {
      type: 'order',
      message: `Order ${code || ''} is now ${statusLabel(status)}.`,
    });
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
    const shop = await Shop.findById(order.shop).select('owner name').lean();
    const code = orderCode(order);
    if (shop?.owner) {
      await notifyUser(shop.owner, {
        type: 'order',
        message: `Order ${code || ''} was cancelled by the customer${
          reason ? `: ${reason}` : ''
        }.`,
      });
    }
    await notifyUser(order.user, {
      type: 'order',
      message: `Order ${code || ''} has been cancelled.`,
    });
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
    const shop = await Shop.findById(order.shop).select('owner name').lean();
    if (shop?.owner && rating) {
      const code = orderCode(order);
      await notifyUser(shop.owner, {
        type: 'order',
        message: `Order ${code || ''} received a ${rating}-star review.`,
      });
    }
    res.json({ ok: true, data: { order }, traceId: req.traceId });
  } catch (err) {
    next(err);
  }
};

