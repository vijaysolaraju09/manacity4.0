const Product = require('../models/Product');
const Shop = require('../models/Shop');
const { normalizeProduct } = require('../utils/normalize');
const AppError = require('../utils/AppError');

const ensureIntegerPaise = (value, field) => {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw AppError.badRequest('INVALID_AMOUNT', `${field} must be provided in paise`);
  }
  const rounded = Math.round(value);
  if (!Number.isInteger(rounded)) {
    throw AppError.badRequest('INVALID_AMOUNT', `${field} must be an integer value in paise`);
  }
  if (rounded <= 0) {
    throw AppError.badRequest('INVALID_AMOUNT', `${field} must be greater than 0`);
  }
  return rounded;
};

const toRupees = (paise) => paise / 100;

const sanitizeImage = (value) => {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed || undefined;
};

const parseStock = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric < 0) {
    throw AppError.badRequest('INVALID_STOCK', 'Stock must be zero or a positive number');
  }
  return numeric;
};

const loadShopForOwner = async (shopId, ownerId) => {
  if (!shopId) {
    throw AppError.badRequest('SHOP_REQUIRED', 'Shop id is required');
  }
  const shop = await Shop.findOne({ _id: shopId, owner: ownerId }).select('name location owner');
  if (!shop) {
    throw AppError.notFound('SHOP_NOT_FOUND', 'Shop not found or not accessible');
  }
  return shop;
};

exports.listShopProducts = async (req, res, next) => {
  try {
    const { shopId } = req.params;
    const shop = await loadShopForOwner(shopId, req.user._id);

    const products = await Product.find({ shop: shop._id, isDeleted: false })
      .populate('shop', 'name image location')
      .lean();

    const normalized = products.map((product) => normalizeProduct(product));

    res.json({ ok: true, data: { products: normalized } });
  } catch (err) {
    next(err);
  }
};

exports.createShopProduct = async (req, res, next) => {
  try {
    const { shopId } = req.params;
    const shop = await loadShopForOwner(shopId, req.user._id);
    const {
      name,
      description = '',
      pricePaise,
      mrpPaise,
      category,
      imageUrl,
      stock = 0,
      status,
      available,
      isSpecial,
    } = req.body ?? {};

    if (!name || typeof name !== 'string') {
      throw AppError.badRequest('NAME_REQUIRED', 'Name is required');
    }

    if (!category || typeof category !== 'string') {
      throw AppError.badRequest('CATEGORY_REQUIRED', 'Category is required');
    }

    const ensuredPrice = ensureIntegerPaise(pricePaise, 'Price');
    const ensuredMrp = ensureIntegerPaise(mrpPaise, 'MRP');
    if (ensuredPrice > ensuredMrp) {
      throw AppError.badRequest('INVALID_AMOUNT', 'Price cannot exceed MRP');
    }

    const parsedStock = parseStock(stock);

    const primaryImage = sanitizeImage(imageUrl);

    const product = await Product.create({
      shop: shop._id,
      createdBy: req.user._id,
      updatedBy: req.user._id,
      name: name.trim(),
      description: typeof description === 'string' ? description : '',
      price: toRupees(ensuredPrice),
      mrp: toRupees(ensuredMrp),
      category: category.trim(),
      image: primaryImage,
      images: primaryImage ? [primaryImage] : [],
      stock: parsedStock,
      status,
      available,
      isSpecial,
      city: shop.location,
    });

    const normalized = normalizeProduct(product.toObject());

    res.status(201).json({ ok: true, data: { product: normalized } });
  } catch (err) {
    next(err);
  }
};

exports.updateBusinessProduct = async (req, res, next) => {
  try {
    const { id } = req.params;
    const product = await Product.findOne({ _id: id, isDeleted: false });
    if (!product) {
      throw AppError.notFound('PRODUCT_NOT_FOUND', 'Product not found');
    }

    const shop = await loadShopForOwner(product.shop, req.user._id);

    const {
      shopId,
      name,
      description,
      pricePaise,
      mrpPaise,
      price,
      mrp,
      category,
      imageUrl,
      image,
      images,
      stock,
      status,
      available,
      isSpecial,
    } = req.body ?? {};

    if (shopId && shopId !== product.shop.toString()) {
      const nextShop = await loadShopForOwner(shopId, req.user._id);
      product.shop = nextShop._id;
      product.city = nextShop.location;
    } else {
      product.shop = shop._id;
      product.city = shop.location;
    }

    if (typeof name === 'string') {
      product.name = name.trim();
    }
    if (typeof description === 'string') {
      product.description = description;
    }

    if (pricePaise !== undefined) {
      const ensured = ensureIntegerPaise(pricePaise, 'Price');
      product.price = toRupees(ensured);
    } else if (price !== undefined) {
      const numeric = Number(price);
      if (!Number.isFinite(numeric) || numeric <= 0) {
        throw AppError.badRequest('INVALID_AMOUNT', 'Price must be greater than 0');
      }
      product.price = numeric;
    }

    if (mrpPaise !== undefined) {
      const ensured = ensureIntegerPaise(mrpPaise, 'MRP');
      product.mrp = toRupees(ensured);
    } else if (mrp !== undefined) {
      const numeric = Number(mrp);
      if (!Number.isFinite(numeric) || numeric <= 0) {
        throw AppError.badRequest('INVALID_AMOUNT', 'MRP must be greater than 0');
      }
      product.mrp = numeric;
    }

    if (product.price && product.mrp && product.price > product.mrp) {
      throw AppError.badRequest('INVALID_AMOUNT', 'Price cannot exceed MRP');
    }

    if (typeof category === 'string') {
      product.category = category.trim();
    }

    if (imageUrl !== undefined) {
      const sanitized = sanitizeImage(imageUrl);
      product.image = sanitized;
      product.images = sanitized ? [sanitized] : [];
    }

    if (image !== undefined) {
      product.image = sanitizeImage(image) ?? null;
      if (product.image && (!Array.isArray(product.images) || product.images.length === 0)) {
        product.images = [product.image];
      }
    }

    if (images !== undefined) {
      const nextImages = Array.isArray(images)
        ? images
            .map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
            .filter((entry) => Boolean(entry))
        : [];
      product.images = nextImages;
      if (nextImages.length) {
        product.image = nextImages[0];
      } else if (imageUrl === undefined && image === undefined) {
        product.image = product.image || null;
      }
    }

    if (stock !== undefined) {
      product.stock = parseStock(stock);
    }

    if (status !== undefined) {
      product.status = status;
    }

    if (available !== undefined) {
      product.available = available;
    }

    if (isSpecial !== undefined) {
      product.isSpecial = isSpecial;
    }

    product.updatedBy = req.user._id;

    await product.save();

    const normalized = normalizeProduct(product.toObject());

    res.json({ ok: true, data: { product: normalized } });
  } catch (err) {
    next(err);
  }
};

exports.deleteBusinessProduct = async (req, res, next) => {
  try {
    const { id } = req.params;
    const product = await Product.findOne({ _id: id, isDeleted: false });
    if (!product) {
      throw AppError.notFound('PRODUCT_NOT_FOUND', 'Product not found');
    }

    await loadShopForOwner(product.shop, req.user._id);

    product.isDeleted = true;
    product.deletedAt = new Date();
    product.updatedBy = req.user._id;
    await product.save();

    res.json({ ok: true, data: { product: normalizeProduct(product.toObject()) } });
  } catch (err) {
    next(err);
  }
};
