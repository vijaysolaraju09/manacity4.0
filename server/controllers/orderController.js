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

const resolveShippingAddress = ({ shippingAddress, addressId, userAddresses }) => {
  let shippingAddressInput = sanitizeShippingAddress(shippingAddress);

  if (!shippingAddressInput && addressId) {
    const addresses = Array.isArray(userAddresses) ? userAddresses : [];
    const matched = addresses.find((addr) =>
      [addr?._id, addr?.id]
        .filter(Boolean)
        .some((value) => value.toString() === String(addressId)),
    );

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

  return shippingAddressInput;
};

const createShopOrder = async ({
  shopId,
  items,
  user,
  notes,
  shippingAddress,
  addressId,
  fulfillmentInput,
  fulfillmentType,
  paymentMethod,
  payment,
  idempotencyKey,
}) => {
  if (!shopId || !Array.isArray(items) || items.length === 0) {
    throw AppError.badRequest('INVALID_ORDER', 'Invalid order payload');
  }

  const trimmedKey = typeof idempotencyKey === 'string' ? idempotencyKey.trim() : '';
  if (trimmedKey) {
    const existing = await Order.findOne({ 'payment.idempotencyKey': trimmedKey });
    if (existing) {
      const existingShop = await Shop.findById(existing.shop)
        .select('name location address owner')
        .lean();
      return { order: existing, shop: existingShop, isNew: false };
    }
  }

  const shop = await Shop.findById(shopId)
    .select('name location address owner')
    .lean();
  if (!shop) throw AppError.notFound('SHOP_NOT_FOUND', 'Shop not found');

  const productIds = items.map((i) => i.productId);
  const products = await Product.find({ _id: { $in: productIds }, shop: shopId }).lean();
  const productMap = new Map(products.map((p) => [p._id.toString(), p]));

  const orderItems = [];
  let itemsTotal = 0;

  for (const i of items) {
    const productId = String(i.productId);
    const p = productMap.get(productId);
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

  const userAddresses = Array.isArray(user?.addresses) ? user.addresses : [];
  const shippingAddressInput = resolveShippingAddress({
    shippingAddress,
    addressId,
    userAddresses,
  });

  const resolvedFulfillmentType =
    fulfillmentInput?.type ||
    (typeof fulfillmentType === 'string' ? fulfillmentType : undefined) ||
    'delivery';

  if (resolvedFulfillmentType === 'delivery') {
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
    fulfillmentInput && typeof fulfillmentInput === 'object'
      ? { ...fulfillmentInput, type: resolvedFulfillmentType }
      : { type: resolvedFulfillmentType };

  const order = await Order.create({
    shop: shop._id,
    shopSnapshot: {
      name: shop.name,
      location: shop.location,
      address: shop.address,
    },
    user: user._id,
    userSnapshot: {
      name: user.name,
      phone: user.phone,
      location: user.location,
      address: user.address,
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
      idempotencyKey: trimmedKey || undefined,
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
  if (shop?.owner) {
    await notifyUser(shop.owner, {
      type: 'order',
      message: `New order ${code || ''} from ${user.name || 'a customer'}.`,
    });
  }
  await notifyUser(user._id, {
    type: 'order',
    message: `Your order ${code || ''} with ${shop.name} is awaiting shop acceptance.`,
  });

  return { order, shop, isNew: true };
};

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

    const idempotencyKey = req.get('Idempotency-Key');

    const { order, isNew } = await createShopOrder({
      shopId,
      items,
      user: req.user,
      notes,
      shippingAddress,
      addressId,
      fulfillmentInput: fulfillment,
      fulfillmentType,
      paymentMethod,
      payment,
      idempotencyKey,
    });

    const statusCode = isNew ? 201 : 200;
    res.status(statusCode).json({ ok: true, data: { order }, traceId: req.traceId });
  } catch (err) {
    next(err);
  }
};

exports.checkoutOrders = async (req, res, next) => {
  try {
    const {
      items,
      addressId,
      shippingAddress,
      paymentMethod,
      payment,
      notes,
      fulfillment,
      fulfillmentType,
    } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      throw AppError.badRequest('INVALID_ORDER', 'Invalid order payload');
    }

    const sanitizedItems = items.map((item) => {
      if (!item || typeof item !== 'object') {
        throw AppError.badRequest('INVALID_ORDER_ITEM', 'Invalid order item');
      }
      const productId = String(item.productId || item.product || '').trim();
      if (!productId) {
        throw AppError.badRequest('INVALID_ORDER_ITEM', 'Product id required');
      }
      const qty = Number(item.qty ?? item.quantity ?? 0);
      if (!Number.isFinite(qty) || qty <= 0) {
        throw AppError.badRequest('INVALID_QTY', 'Quantity must be greater than zero');
      }
      return {
        productId,
        qty,
        options: item.options || {},
      };
    });

    const productIds = sanitizedItems.map((item) => item.productId);
    const catalog = await Product.find({ _id: { $in: productIds } })
      .select('_id shop')
      .lean();
    const productToShop = new Map(catalog.map((product) => [product._id.toString(), product.shop?.toString()]));

    const groups = new Map();
    sanitizedItems.forEach((item) => {
      const shopId = productToShop.get(item.productId);
      if (!shopId) {
        throw AppError.badRequest('PRODUCT_NOT_FOUND', 'Product not found');
      }

      const existing = groups.get(shopId);
      if (existing) {
        existing.items.push(item);
      } else {
        groups.set(shopId, { shopId, items: [item] });
      }
    });

    const idempotencyKey = req.get('Idempotency-Key');
    const orders = [];
    let anyNew = false;

    for (const group of groups.values()) {
      const { order, isNew } = await createShopOrder({
        shopId: group.shopId,
        items: group.items,
        user: req.user,
        notes,
        shippingAddress,
        addressId,
        fulfillmentInput: fulfillment,
        fulfillmentType: fulfillmentType || 'delivery',
        paymentMethod,
        payment,
        idempotencyKey: idempotencyKey ? `${idempotencyKey}:${group.shopId}` : undefined,
      });
      anyNew = anyNew || isNew;
      orders.push({ _id: order._id, shopId: order.shop });
    }

    const statusCode = anyNew ? 201 : 200;
    res.status(statusCode).json({ ok: true, data: { orders }, traceId: req.traceId });
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

