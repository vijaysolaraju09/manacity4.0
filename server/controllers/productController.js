const Product = require('../models/Product');
const Shop = require('../models/Shop');
const cache = require('../utils/cache');
const { normalizeProduct } = require('../utils/normalize');

const PRODUCTS_CACHE_PREFIX = 'products:';

const buildProductsCacheKey = (params = {}) => `${PRODUCTS_CACHE_PREFIX}${JSON.stringify(params)}`;

const invalidateProductCache = () => cache.invalidatePrefix(PRODUCTS_CACHE_PREFIX);

const ensurePaise = (value, field) => {
  if (typeof value !== 'number' || !Number.isInteger(value)) {
    throw Object.assign(new Error(`${field} must be an integer amount in paise`), {
      statusCode: 400,
    });
  }
  if (value <= 0) {
    throw Object.assign(new Error(`${field} must be greater than 0`), { statusCode: 400 });
  }
  return value;
};

const toPrice = (paise) => paise / 100;

exports.createProduct = async (req, res, next) => {
  try {
    const {
      shopId,
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
    } = req.body;

    if (!shopId) {
      return res.status(400).json({ error: 'Shop is required' });
    }
    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }
    if (!category) {
      return res.status(400).json({ error: 'Category is required' });
    }

    let parsedPrice;
    let parsedMrp;
    try {
      const ensuredPrice = ensurePaise(pricePaise, 'Price');
      const ensuredMrp = ensurePaise(mrpPaise, 'MRP');
      if (ensuredPrice > ensuredMrp) {
        return res.status(400).json({ error: 'Price cannot exceed MRP' });
      }
      parsedPrice = toPrice(ensuredPrice);
      parsedMrp = toPrice(ensuredMrp);
    } catch (err) {
      const statusCode = err.statusCode || 400;
      return res.status(statusCode).json({ error: err.message || 'Invalid price payload' });
    }

    const shop = await Shop.findOne({ _id: shopId, owner: req.user._id });
    if (!shop) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const trimmedImage = typeof imageUrl === 'string' ? imageUrl.trim() : '';
    const numericStock = Number(stock);
    const parsedStock = Number.isFinite(numericStock) && numericStock >= 0 ? numericStock : 0;
    const product = await Product.create({
      shop: shop._id,
      createdBy: req.user._id,
      updatedBy: req.user._id,
      name,
      description,
      price: parsedPrice,
      mrp: parsedMrp,
      category,
      image: trimmedImage || undefined,
      images: trimmedImage ? [trimmedImage] : [],
      stock: parsedStock,
      status,
      available,
      isSpecial,
      city: shop.location,
    });

    const payload = normalizeProduct(product);
    const normalizedId = payload?._id || (product?._id ? product._id.toString() : undefined);
    const responseProduct = normalizedId
      ? { ...payload, _id: normalizedId, id: normalizedId }
      : payload;
    invalidateProductCache();
    return res.status(201).json({ ok: true, data: { product: responseProduct } });
  } catch (err) {
    if (err?.statusCode) {
      return res.status(err.statusCode).json({ error: err.message });
    }
    return next(err);
  }
};

exports.updateProduct = async (req, res, next) => {
  try {
    const product = await Product.findOne({ _id: req.params.id, isDeleted: false });
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

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
    } = req.body;

    if (shopId) {
      const shop = await Shop.findOne({ _id: shopId, owner: req.user._id });
      if (!shop) {
        return res.status(403).json({ error: 'Not authorized' });
      }
      product.shop = shop._id;
      product.city = shop.location;
    } else if (req.user.role !== 'admin') {
      const shop = await Shop.findOne({ _id: product.shop, owner: req.user._id });
      if (!shop) {
        return res.status(403).json({ error: 'Not authorized' });
      }
    }

    if (name !== undefined) product.name = name;
    if (description !== undefined) product.description = description;

    if (pricePaise !== undefined) {
      try {
        const ensured = ensurePaise(pricePaise, 'Price');
        product.price = toPrice(ensured);
      } catch (err) {
        const statusCode = err.statusCode || 400;
        return res.status(statusCode).json({ error: err.message });
      }
    } else if (price !== undefined) {
      if (price <= 0) {
        return res.status(400).json({ error: 'Price must be greater than 0' });
      }
      product.price = price;
    }

    if (mrpPaise !== undefined) {
      try {
        const ensured = ensurePaise(mrpPaise, 'MRP');
        product.mrp = toPrice(ensured);
      } catch (err) {
        const statusCode = err.statusCode || 400;
        return res.status(statusCode).json({ error: err.message });
      }
    } else if (mrp !== undefined) {
      if (mrp <= 0) {
        return res.status(400).json({ error: 'MRP must be greater than 0' });
      }
      product.mrp = mrp;
    }

    if (product.price && product.mrp && product.price > product.mrp) {
      return res.status(400).json({ error: 'Price cannot exceed MRP' });
    }

    if (category !== undefined) product.category = category;

    if (imageUrl !== undefined) {
      const trimmed = typeof imageUrl === 'string' ? imageUrl.trim() : '';
      product.image = trimmed || undefined;
      product.images = trimmed ? [trimmed] : [];
    }

    if (image !== undefined) {
      product.image = image;
      if (image && (!Array.isArray(product.images) || !product.images.length)) {
        product.images = [image];
      }
    }

    if (images !== undefined) {
      const nextImages = Array.isArray(images)
        ? images.filter((img) => typeof img === 'string' && img.trim())
        : [];
      product.images = nextImages;
      if (nextImages.length) {
        product.image = nextImages[0];
      } else if (!imageUrl && !image) {
        product.image = product.image || null;
      }
    }

    if (stock !== undefined) {
      const nextStock = Number(stock);
      if (!Number.isFinite(nextStock) || nextStock < 0) {
        return res.status(400).json({ error: 'Stock must be a non-negative number' });
      }
      product.stock = nextStock;
    }
    if (status !== undefined) product.status = status;
    if (available !== undefined) product.available = available;
    if (isSpecial !== undefined) product.isSpecial = isSpecial;

    product.updatedBy = req.user._id;
    await product.save();
    const payload = normalizeProduct(product);
    invalidateProductCache();
    return res.json({ ok: true, data: { product: payload } });
  } catch (err) {
    return next(err);
  }
};

exports.deleteProduct = async (req, res, next) => {
  try {
    const product = await Product.findOne({ _id: req.params.id, isDeleted: false });
    if (!product) return res.status(404).json({ error: 'Product not found' });
    if (req.user.role !== 'admin') {
      const shop = await Shop.findOne({ _id: product.shop, owner: req.user._id });
      if (!shop) return res.status(403).json({ error: 'Not authorized' });
    }

    product.isDeleted = true;
    product.deletedAt = new Date();
    product.updatedBy = req.user._id;
    await product.save();
    invalidateProductCache();
    res.json({ message: 'Product deleted' });
  } catch (err) {
    return next(err);
  }
};

const toBooleanQuery = (value) => {
  if (value === undefined) return undefined;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['true', '1', 'yes'].includes(normalized)) return true;
    if (['false', '0', 'no'].includes(normalized)) return false;
  }
  return undefined;
};

exports.getProducts = async (req, res, next) => {
  try {
    const {
      shopId,
      query,
      q,
      category,
      status,
      minPrice,
      maxPrice,
      city,
      available,
      isSpecial,
      page = 1,
      pageSize,
      limit,
    } = req.query;

    const filter = { isDeleted: false };
    const searchTerm = typeof query === 'string' && query.trim() ? query.trim() : typeof q === 'string' ? q.trim() : '';
    if (shopId) filter.shop = shopId;
    if (category) filter.category = category;
    if (status) filter.status = status;
    if (city) filter.city = city;
    const availableFlag = toBooleanQuery(available);
    if (availableFlag !== undefined) filter.available = availableFlag;
    const specialFlag = toBooleanQuery(isSpecial);
    if (specialFlag !== undefined) filter.isSpecial = specialFlag;
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = Number(minPrice);
      if (maxPrice) filter.price.$lte = Number(maxPrice);
    }
    if (searchTerm) filter.name = { $regex: searchTerm, $options: 'i' };

    const pageNumber = Math.max(Number(page) || 1, 1);
    const sizeInput = limit ?? pageSize;
    const resolvedPageSize = Math.max(Math.min(Number(sizeInput) || 20, 100), 1);
    const skip = (pageNumber - 1) * resolvedPageSize;

    const priceFilter = filter.price || {};
    const cacheKey = buildProductsCacheKey({
      shopId: filter.shop || null,
      category: filter.category || null,
      status: filter.status || null,
      city: filter.city || null,
      available: availableFlag,
      isSpecial: specialFlag,
      minPrice: priceFilter.$gte ?? null,
      maxPrice: priceFilter.$lte ?? null,
      searchTerm,
      page: pageNumber,
      pageSize: resolvedPageSize,
    });
    const cached = cache.get(cacheKey);
    if (cached) {
      return res.json({ ok: true, data: cached, traceId: req.traceId });
    }

    const queryBuilder = Product.find(filter)
      .populate('shop', 'name image location')
      .sort({ isSpecial: -1, createdAt: -1 })
      .skip(skip)
      .limit(resolvedPageSize);
    const [itemsRaw, total] = await Promise.all([queryBuilder.lean(), Product.countDocuments(filter)]);
    const items = itemsRaw.map((item) => normalizeProduct(item));
    const responseData = {
      items,
      total,
      page: pageNumber,
      pageSize: resolvedPageSize,
      hasMore: skip + items.length < total,
    };
    cache.set(cacheKey, responseData, 60_000);
    res.json({ ok: true, data: responseData, traceId: req.traceId });
  } catch (err) {
    return next(err);
  }
};

exports.getMyProducts = async (req, res, next) => {
  try {
    const shops = await Shop.find({ owner: req.user._id });
    const shopIds = shops.map((s) => s._id);
    const products = await Product.find({ shop: { $in: shopIds }, isDeleted: false })
      .populate('shop', 'name image location')
      .lean();
    res.json(products.map((product) => normalizeProduct(product)));
  } catch (err) {
    return next(err);
  }
};

exports.getProductById = async (req, res, next) => {
  try {
    const product = await Product.findOne({ _id: req.params.id, isDeleted: false })
      .populate('shop', 'name image location')
      .lean();
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json(normalizeProduct(product));
  } catch (err) {
    return next(err);
  }
};
