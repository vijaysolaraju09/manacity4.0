const { Types } = require('mongoose');
const { CartModel } = require('../models/Cart');
const Product = require('../models/Product');
const AppError = require('../utils/AppError');
const { toPaise, ensurePositiveInteger } = require('../utils/currency');

const toIdString = (value) => {
  if (!value) return undefined;
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  if (typeof value === 'object' && typeof value.toString === 'function') {
    return value.toString();
  }
  return undefined;
};

const parseObjectId = (value) => {
  if (value instanceof Types.ObjectId) return value;
  if (typeof value === 'string' && Types.ObjectId.isValid(value)) {
    return new Types.ObjectId(value);
  }
  return null;
};

const formatCartItem = (item) => {
  if (!item) return null;
  const productId = toIdString(item.productId);
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
    ? doc.items
        .map((item) => formatCartItem(item))
        .filter((value) => Boolean(value))
    : [];

  const subtotalPaise = Math.max(0, Math.round(doc.subtotal ?? 0));
  const discountPaise = Math.max(0, Math.round(doc.discountTotal ?? 0));
  const grandPaise = Math.max(0, Math.round(doc.grandTotal ?? subtotalPaise - discountPaise));

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
  const images = Array.isArray(product.images)
    ? product.images.filter((img) => typeof img === 'string')
    : undefined;
  const primaryImage = product.image || (images && images[0]) || undefined;

  const productId = product._id?.toString?.() || product.id?.toString?.();

  return {
    productId,
    shopId,
    pricePaise: unitPricePaise,
    name: product.name,
    image: primaryImage,
    product: {
      _id: productId,
      id: productId,
      name: product.name,
      title: product.name,
      image: primaryImage,
      images,
      price: product.price,
      pricePaise: unitPricePaise,
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

exports.addToCart = async (req, res, next) => {
  try {
    const { productId: rawProductId, quantity, variantId: rawVariantId } = req.body ?? {};

    const productObjectId = parseObjectId(rawProductId);
    if (!productObjectId) {
      throw AppError.badRequest('INVALID_PRODUCT_ID', 'Invalid product id');
    }

    const quantityToAdd = ensurePositiveInteger(quantity, 1);

    const product = await Product.findById(productObjectId).populate('shop');
    if (!product || product.isDeleted || product.status === 'archived') {
      throw AppError.notFound('PRODUCT_NOT_FOUND', 'Product not found');
    }

    const shopId = toIdString(product.shop?._id ?? product.shop);
    if (!shopId) {
      throw AppError.internal('SHOP_NOT_LINKED', 'Product is missing shop metadata');
    }

    const unitPricePaise = Math.max(
      0,
      Number.isFinite(product.pricePaise) ? Math.round(product.pricePaise) : toPaise(product.price),
    );

    if (!Number.isFinite(unitPricePaise) || unitPricePaise <= 0) {
      throw AppError.badRequest('INVALID_PRODUCT_PRICE', 'Product price is invalid');
    }

    const variantObjectId = parseObjectId(rawVariantId ?? undefined) ?? undefined;

    const { cart, created } = await CartModel.upsertItem(req.user._id, {
      productId: productObjectId,
      variantId: variantObjectId,
      qty: quantityToAdd,
      unitPrice: unitPricePaise,
    });

    const responseItem = buildResponseItem(product, unitPricePaise, shopId);

    res.status(created ? 201 : 200).json({
      ok: true,
      data: {
        cartItem: responseItem,
        cart: serializeCart(cart),
      },
      traceId: req.traceId,
    });
  } catch (err) {
    if (err instanceof AppError) {
      next(err);
    } else {
      next(AppError.internal('ADD_CART_FAILED', 'Failed to add to cart'));
    }
  }
};

exports.getMyCart = async (req, res, next) => {
  try {
    const cart = await CartModel.findOne({ userId: req.user._id });
    res.json({
      ok: true,
      data: {
        cart: serializeCart(cart),
      },
      traceId: req.traceId,
    });
  } catch (err) {
    if (err instanceof AppError) {
      next(err);
    } else {
      next(AppError.internal('FETCH_CART_FAILED', 'Failed to fetch cart'));
    }
  }
};

exports.removeFromCart = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { variantId } = req.query ?? {};

    const productObjectId = parseObjectId(id);
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

    res.json({
      ok: true,
      data: {
        cart: serializeCart(result.cart),
      },
      traceId: req.traceId,
    });
  } catch (err) {
    if (err instanceof AppError) {
      next(err);
    } else {
      next(AppError.internal('REMOVE_CART_FAILED', 'Failed to remove item'));
    }
  }
};
