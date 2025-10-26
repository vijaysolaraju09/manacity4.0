const asyncHandler = require('../middleware/asyncHandler');
const { success } = require('../utils/response');
const AppError = require('../../utils/AppError');
const Order = require('../../models/Order');
const Product = require('../../models/Product');
const Shop = require('../../models/Shop');
const { CartModel } = require('../../models/Cart');
const { notifyUser } = require('../../services/notificationService');
const {
  findAddressesForUser,
  upsertAddressFromShipping,
} = require('../../services/addressBookService');
const { ensurePositiveInteger, toPaise } = require('../../utils/currency');

const allowedTransitions = {
  pending: ['accepted', 'rejected'],
};

const ownerRoles = new Set(['owner', 'business']);

const statusLabel = (status) =>
  String(status || '')
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

const orderCode = (order) =>
  (order?._id ? order._id.toString() : '')
    .slice(-6)
    .toUpperCase();

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
  userAddresses,
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

  for (const item of items) {
    const productId = String(item.productId);
    const product = productMap.get(productId);
    if (!product) throw AppError.badRequest('PRODUCT_NOT_FOUND', 'Product not found');

    const providedUnitPrice = Number.isFinite(item.unitPricePaise)
      ? Math.max(0, Math.round(item.unitPricePaise))
      : null;
    const unitPrice = providedUnitPrice ?? toPaise(product.price);
    if (!Number.isFinite(unitPrice) || unitPrice < 0) {
      throw AppError.badRequest('INVALID_PRODUCT_PRICE', 'Product price invalid');
    }

    const qty = Number(item.qty ?? item.quantity);
    if (!Number.isFinite(qty) || qty <= 0) {
      throw AppError.badRequest('INVALID_QTY', 'Quantity must be greater than zero');
    }

    const subtotal = unitPrice * qty;
    itemsTotal += subtotal;

    orderItems.push({
      product: product._id,
      productSnapshot: {
        name: product.name,
        image: product.image,
        sku: product.sku,
        category: product.category,
      },
      unitPrice,
      qty,
      subtotal,
      options: item.options || {},
    });
  }

  const discountTotal = 0;
  const taxTotal = 0;
  const shippingFee = 0;
  const grandTotal = itemsTotal - discountTotal + taxTotal + shippingFee;

  const addressBook = Array.isArray(userAddresses)
    ? userAddresses
    : await findAddressesForUser(user._id);
  const shippingAddressInput = resolveShippingAddress({
    shippingAddress,
    addressId,
    userAddresses: addressBook,
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

  if (shippingAddressInput) {
    await upsertAddressFromShipping(user._id, shippingAddressInput);
  }

  return { order, shop, isNew: true };
};

const checkoutOrders = asyncHandler(async (req, res) => {
  const {
    items: rawItems,
    addressId,
    shippingAddress,
    paymentMethod,
    payment,
    notes,
    fulfillment,
    fulfillmentType,
  } = req.body ?? {};

  let items = Array.isArray(rawItems) ? rawItems : [];
  let cart;
  let usedCart = false;

  if (!items.length) {
    cart = await CartModel.findOne({ userId: req.user._id });
    if (!cart || !Array.isArray(cart.items) || cart.items.length === 0) {
      throw AppError.badRequest('CART_EMPTY', 'Your cart is empty');
    }
    usedCart = true;
    items = cart.items
      .map((item) => ({
        productId: item.productId?.toString?.() || item.product?.toString?.(),
        qty: ensurePositiveInteger(item.qty, 0),
        unitPricePaise: Math.max(0, Math.round(item.unitPrice ?? 0)),
        options: item.options || {},
      }))
      .filter((item) => item.productId && item.qty > 0);
  }

  if (!items.length) {
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
    const rawUnitPrice =
      item.unitPricePaise ?? item.unitPrice ?? item.pricePaise ?? null;
    const normalizedUnitPrice = Number.isFinite(rawUnitPrice)
      ? Math.max(0, Math.round(rawUnitPrice))
      : undefined;
    return {
      productId,
      qty,
      options: item.options || {},
      unitPricePaise: normalizedUnitPrice,
    };
  });

  const productIds = sanitizedItems.map((item) => item.productId);
  const catalog = await Product.find({ _id: { $in: productIds } })
    .select('_id shop')
    .lean();
  const productToShop = new Map(
    catalog.map((product) => [product._id.toString(), product.shop?.toString()]),
  );

  const groups = new Map();
  sanitizedItems.forEach((item) => {
    const shopId = productToShop.get(item.productId);
    if (!shopId) {
      throw AppError.badRequest('PRODUCT_NOT_FOUND', 'Product not found');
    }

    if (groups.has(shopId)) {
      groups.get(shopId).items.push(item);
    } else {
      groups.set(shopId, { shopId, items: [item] });
    }
  });

  const idempotencyKey = req.get('Idempotency-Key');
  const orders = [];
  let anyNew = false;

  const userAddresses = await findAddressesForUser(req.user._id);

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
      userAddresses,
    });
    anyNew = anyNew || isNew;
    orders.push({
      id: order._id.toString(),
      shopId: order.shop.toString(),
      status: order.status,
      grandTotal: order.grandTotal,
    });
  }

  if (usedCart && cart) {
    cart.items = [];
    await cart.save();
  }

  const statusCode = anyNew ? 201 : 200;
  return res.status(statusCode).json(success('Checkout complete', { orders }));
});

const getMyOrders = asyncHandler(async (req, res) => {
  const { status } = req.query;
  const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
  const pageSize = Math.max(1, Math.min(100, Number.parseInt(req.query.pageSize, 10) || 20));

  const query = Order.find({ user: req.user._id });
  if (status) query.where('status').equals(status);

  const orders = await query
    .sort({ createdAt: -1 })
    .skip((page - 1) * pageSize)
    .limit(pageSize)
    .lean();

  return res.json(
    success('Orders fetched', {
      items: orders,
      page,
      pageSize,
    }),
  );
});

const getReceivedOrders = asyncHandler(async (req, res) => {
  const { status } = req.query;
  const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
  const pageSize = Math.max(1, Math.min(100, Number.parseInt(req.query.pageSize, 10) || 20));

  const shops = await Shop.find({ owner: req.user._id }).select('_id').lean();
  const shopIds = shops.map((shop) => shop._id);
  if (!shopIds.length) {
    return res.json(success('Orders fetched', { items: [], page, pageSize }));
  }

  const query = Order.find({ shop: { $in: shopIds } });
  if (status) query.where('status').equals(status);

  const orders = await query
    .sort({ createdAt: -1 })
    .skip((page - 1) * pageSize)
    .limit(pageSize)
    .lean();

  return res.json(
    success('Orders fetched', {
      items: orders,
      page,
      pageSize,
    }),
  );
});

const updateOrderStatus = asyncHandler(async (req, res) => {
  const { status, note } = req.body ?? {};
  const order = await Order.findById(req.params.id);
  if (!order) throw AppError.notFound('ORDER_NOT_FOUND', 'Order not found');

  const shop = await Shop.findById(order.shop).select('owner').lean();
  const isShopOwner = shop && shop.owner.toString() === req.user._id.toString();
  const role = typeof req.user.role === 'string' ? req.user.role.toLowerCase() : '';
  if (!isShopOwner || !ownerRoles.has(role)) {
    throw AppError.forbidden('NOT_AUTHORIZED', 'Not authorized');
  }

  const nextStatus = typeof status === 'string' ? status.toLowerCase() : '';
  const allowed = allowedTransitions[order.status] || [];
  if (!allowed.includes(nextStatus)) {
    throw AppError.badRequest('INVALID_STATUS', 'Invalid status transition');
  }

  order.status = nextStatus;
  order.timeline.push({
    at: new Date(),
    by: 'shop',
    status: nextStatus,
    note,
  });
  if (nextStatus === 'rejected') {
    order.cancel = {
      by: 'shop',
      reason: note,
      at: new Date(),
    };
  }
  await order.save();

  const code = orderCode(order);
  await notifyUser(order.user, {
    type: 'order',
    message: `Order ${code || ''} is now ${statusLabel(nextStatus)}.`,
  });

  const updatedOrder = await Order.findById(order._id).lean();
  return res.json(success('Order status updated', { order: updatedOrder }));
});

module.exports = {
  checkoutOrders,
  getMyOrders,
  getReceivedOrders,
  updateOrderStatus,
};
