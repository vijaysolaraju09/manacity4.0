const { Types } = require('mongoose');
const asyncHandler = require('../middleware/asyncHandler');
const { success } = require('../utils/response');
const AppError = require('../../utils/AppError');
const { ensurePositiveInteger, toPaise } = require('../../utils/currency');
const { CartModel } = require('../../models/Cart');
const Product = require('../../models/Product');

const toIdString = (value) => {
  if (!value) return undefined;
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  if (value instanceof Types.ObjectId) return value.toString();
  if (typeof value === 'object' && typeof value.toString === 'function') {
    return value.toString();
  }
  return undefined;
};

const parseObjectId = (value) => {
  if (!value) return null;
  if (value instanceof Types.ObjectId) return value;
  if (typeof value === 'string' && Types.ObjectId.isValid(value)) {
    return new Types.ObjectId(value);
  }
  return null;
};

const formatCartItem = (item) => {
  if (!item) return null;
  const productId = toIdString(item.productId || item.product);
  if (!productId) return null;

  const qty = ensurePositiveInteger(item.qty, 0);
  const unitPricePaise = Math.max(0, Math.round(item.unitPrice ?? 0));
  const discountPaise = Math.max(0, Math.round(item.appliedDiscount ?? 0));

  return {
    productId,
    variantId: toIdString(item.variantId) ?? undefined,
    qty,
    unitPricePaise,
    subtotalPaise: unitPricePaise * qty,
    discountPaise,
  };
};

const serializeCart = (cart) => {
  if (!cart) {
    return {
      id: null,
      currency: 'INR',
      items: [],
      totals: {
        subtotalPaise: 0,
        discountPaise: 0,
        grandPaise: 0,
      },
      updatedAt: new Date(0).toISOString(),
    };
  }

  const doc = typeof cart.toObject === 'function' ? cart.toObject() : cart;
  const items = Array.isArray(doc.items)
    ? doc.items.map((item) => formatCartItem(item)).filter(Boolean)
    : [];

  const subtotalPaise = Math.max(0, Math.round(doc.subtotal ?? 0));
  const discountPaise = Math.max(0, Math.round(doc.discountTotal ?? 0));
  const grandPaise = Math.max(
    0,
    Math.round(doc.grandTotal ?? subtotalPaise - discountPaise),
  );

  return {
    id: toIdString(doc._id) ?? null,
    currency: doc.currency || 'INR',
    items,
    totals: {
      subtotalPaise,
      discountPaise,
      grandPaise,
    },
    updatedAt:
      (doc.updatedAt && new Date(doc.updatedAt).toISOString()) ||
      new Date().toISOString(),
  };
};

const buildResponseItem = (product, unitPricePaise, shopId) => {
  if (!product) return null;
  const images = Array.isArray(product.images)
    ? product.images.filter((img) => typeof img === 'string')
    : undefined;
  const primaryImage = product.image || (images && images[0]) || undefined;

  const productId = product._id?.toString?.() || product.id?.toString?.();

  const normalizedPricePaise = Number.isFinite(product.pricePaise)
    ? Math.max(0, Math.round(product.pricePaise))
    : unitPricePaise;
  const mrpPaise = Number.isFinite(product.mrpPaise)
    ? Math.max(0, Math.round(product.mrpPaise))
    : Number.isFinite(product.mrp)
      ? Math.max(0, Math.round(toPaise(product.mrp)))
      : undefined;

  return {
    productId,
    shopId,
    pricePaise: normalizedPricePaise,
    name: product.name,
    image: primaryImage,
    mrpPaise,
    product: {
      _id: productId,
      id: productId,
      name: product.name,
      title: product.name,
      image: primaryImage,
      images,
      price: product.price,
      mrp: product.mrp,
      pricePaise: normalizedPricePaise,
      mrpPaise,
      shopId,
    },
    shop:
      typeof product.shop === 'object' && product.shop
        ? {
            _id: toIdString(product.shop._id) ?? shopId,
            id: toIdString(product.shop._id) ?? shopId,
            name: product.shop.name,
            image: product.shop.image,
          }
        : shopId,
  };
};

const loadProductMap = async (items = []) => {
  const productIds = items
    .map((item) => parseObjectId(item.productId || item.product))
    .filter(Boolean);
  if (!productIds.length) return new Map();

  const products = await Product.find({ _id: { $in: productIds } })
    .select('name price mrp image images shop status isDeleted')
    .populate('shop', 'name image owner')
    .lean();
  return new Map(products.map((product) => [product._id.toString(), product]));
};

const buildCartResponse = async (cart) => {
  const serialized = serializeCart(cart);
  const productMap = await loadProductMap(cart?.items || []);

  const items = serialized.items.map((item) => {
    const product = productMap.get(item.productId);
    if (!product) {
      return {
        ...item,
        name: null,
        image: null,
        product: null,
        shop: null,
      };
    }
    const shopId = toIdString(product.shop?._id ?? product.shop);
    const responseItem = buildResponseItem(product, item.unitPricePaise, shopId);
    return {
      ...item,
      ...responseItem,
    };
  });

  return {
    ...serialized,
    items,
  };
};

const getCart = asyncHandler(async (req, res) => {
  const cart = await CartModel.findOne({ userId: req.user._id });
  const response = await buildCartResponse(cart);
  return res.json(success('Cart fetched', { cart: response }));
});

const addOrUpdateCartItem = asyncHandler(async (req, res) => {
  const { productId: rawProductId, quantity, qty, variantId: rawVariantId } = req.body ?? {};

  const productObjectId = parseObjectId(rawProductId);
  if (!productObjectId) {
    throw AppError.badRequest('INVALID_PRODUCT_ID', 'Invalid product id');
  }

  const product = await Product.findById(productObjectId).populate('shop');
  if (!product || product.isDeleted || product.status === 'archived') {
    throw AppError.notFound('PRODUCT_NOT_FOUND', 'Product not found');
  }

  const requestedQty = ensurePositiveInteger(quantity ?? qty, 1);
  const unitPricePaise = Math.max(
    0,
    Number.isFinite(product.pricePaise)
      ? Math.round(product.pricePaise)
      : toPaise(product.price),
  );
  if (!Number.isFinite(unitPricePaise) || unitPricePaise <= 0) {
    throw AppError.badRequest('INVALID_PRODUCT_PRICE', 'Product price is invalid');
  }

  const variantObjectId = parseObjectId(rawVariantId ?? undefined) ?? undefined;

  const cart = (await CartModel.findOne({ userId: req.user._id })) || new CartModel({ userId: req.user._id });

  const index = cart.items.findIndex(
    (item) =>
      item.productId.equals(productObjectId) &&
      (!variantObjectId
        ? !item.variantId
        : item.variantId && item.variantId.equals(variantObjectId)),
  );

  if (index >= 0) {
    cart.items[index].qty = requestedQty;
    cart.items[index].unitPrice = unitPricePaise;
    cart.items[index].product = cart.items[index].product || productObjectId;
  } else {
    cart.items.push({
      productId: productObjectId,
      product: productObjectId,
      variantId: variantObjectId,
      qty: requestedQty,
      unitPrice: unitPricePaise,
    });
  }

  await cart.save();

  const response = await buildCartResponse(cart);
  const shopId = toIdString(product.shop?._id ?? product.shop);
  const productPayload = product.toObject ? product.toObject() : product;
  const savedItem =
    index >= 0
      ? cart.items[index]
      : cart.items.find(
          (item) =>
            item.productId.equals(productObjectId) &&
            (!variantObjectId
              ? !item.variantId
              : item.variantId && item.variantId.equals(variantObjectId)),
        );
  const cartItemBase = buildResponseItem(productPayload, unitPricePaise, shopId) || {};
  const cartItem = {
    ...cartItemBase,
    qty: savedItem ? savedItem.qty : requestedQty,
    unitPricePaise,
    variantId: savedItem?.variantId ? toIdString(savedItem.variantId) : undefined,
  };

  return res.status(201).json(success('Cart updated', { cart: response, cartItem }));
});

const removeCartItem = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const { variantId } = req.query ?? {};

  const productObjectId = parseObjectId(productId);
  if (!productObjectId) {
    throw AppError.badRequest('INVALID_PRODUCT_ID', 'Invalid product id');
  }

  const variantObjectId = variantId ? parseObjectId(String(variantId)) ?? undefined : undefined;

  const result = await CartModel.removeItem(req.user._id, productObjectId, variantObjectId);
  if (!result) {
    throw AppError.notFound('CART_NOT_FOUND', 'Cart not found');
  }
  if (!result.removed) {
    throw AppError.notFound('CART_ITEM_NOT_FOUND', 'Cart item not found');
  }

  const response = await buildCartResponse(result.cart);
  return res.json(success('Cart item removed', { cart: response }));
});

module.exports = {
  getCart,
  addOrUpdateCartItem,
  removeCartItem,
};
