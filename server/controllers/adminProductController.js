const mongoose = require('mongoose');
const Product = require('../models/Product');
const Shop = require('../models/Shop');
const AppError = require('../utils/AppError');

const STATUS_TO_INTERNAL = {
  active: 'active',
  inactive: 'archived',
  archived: 'archived',
};

const parseSort = (raw, fallback = '-updatedAt') => {
  const sort = typeof raw === 'string' && raw.trim() ? raw.trim() : fallback;
  const direction = sort.startsWith('-') ? -1 : 1;
  const key = sort.startsWith('-') ? sort.slice(1) : sort;
  return { [key || 'updatedAt']: direction };
};

const sanitizeRegex = (value) => {
  if (!value || typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(escaped, 'i');
};

const normalizeProduct = (doc) => {
  const rawImages = Array.isArray(doc.images) ? doc.images : [];
  const images = rawImages.filter((img) => typeof img === 'string' && img.trim());
  const primaryImage = doc.image || images[0] || null;
  if (!images.length && primaryImage) {
    images.push(primaryImage);
  }
  const id =
    doc._id instanceof mongoose.Types.ObjectId
      ? doc._id.toString()
      : String(doc._id);
  const shopIdValue = doc.shop?._id || doc.shop;
  const shopId =
    shopIdValue instanceof mongoose.Types.ObjectId
      ? shopIdValue.toString()
      : shopIdValue
      ? String(shopIdValue)
      : undefined;
  return {
    _id: id,
    id,
    name: doc.name,
    shopId,
    shopName: doc.shop?.name || undefined,
    category: doc.category,
    price: doc.price,
    mrp: doc.mrp,
    discount: doc.discount,
    stock: doc.stock,
    status: doc.status,
    image: primaryImage,
    images,
    updatedAt: doc.updatedAt,
  };
};

exports.createProduct = async (req, res, next) => {
  try {
    const {
      shopId,
      name,
      description,
      category,
      price,
      mrp,
      stock,
      image,
      images,
    } = req.body || {};

    if (!shopId || !mongoose.Types.ObjectId.isValid(shopId)) {
      throw AppError.badRequest('INVALID_SHOP', 'Select a valid shop to continue');
    }

    const shop = await Shop.findOne({ _id: shopId, isDeleted: { $ne: true } });
    if (!shop) {
      throw AppError.notFound('SHOP_NOT_FOUND', 'Shop not found');
    }

    const trimmedName = typeof name === 'string' ? name.trim() : '';
    const trimmedDescription = typeof description === 'string' ? description.trim() : '';
    const trimmedCategory = typeof category === 'string' ? category.trim() : '';

    if (trimmedName.length < 3)
      throw AppError.badRequest('INVALID_NAME', 'Name must be at least 3 characters');
    if (trimmedDescription.length < 10)
      throw AppError.badRequest('INVALID_DESCRIPTION', 'Description must be at least 10 characters');
    if (trimmedCategory.length < 2)
      throw AppError.badRequest('INVALID_CATEGORY', 'Category must be at least 2 characters');

    const priceValue = Number(price);
    const mrpValue = Number(mrp);
    const stockValue = Number(stock);

    if (!Number.isFinite(priceValue) || priceValue <= 0)
      throw AppError.badRequest('INVALID_PRICE', 'Price must be greater than zero');
    if (!Number.isFinite(mrpValue) || mrpValue <= 0)
      throw AppError.badRequest('INVALID_MRP', 'MRP must be greater than zero');
    if (priceValue > mrpValue)
      throw AppError.badRequest('PRICE_GT_MRP', 'Price cannot exceed MRP');
    if (!Number.isFinite(stockValue) || stockValue < 0)
      throw AppError.badRequest('INVALID_STOCK', 'Stock must be zero or a positive number');

    const imageList = Array.isArray(images)
      ? images.filter((img) => typeof img === 'string' && img.trim())
      : [];
    const imageSource =
      typeof image === 'string' && image.trim() ? image.trim() : imageList[0] || undefined;
    if (imageSource && !imageList.includes(imageSource)) {
      imageList.unshift(imageSource);
    }

    const payload = {
      shop: shop._id,
      name: trimmedName,
      description: trimmedDescription,
      category: trimmedCategory,
      price: priceValue,
      mrp: mrpValue,
      stock: stockValue,
      status: 'active',
      image: imageSource,
      images: imageList,
    };

    if (req.user?._id) {
      payload.createdBy = req.user._id;
      payload.updatedBy = req.user._id;
    }

    const product = await Product.create(payload);
    const populated = await Product.findById(product._id).populate('shop', 'name').lean();

    res.status(201).json({
      ok: true,
      data: normalizeProduct(populated || product.toObject()),
      traceId: req.traceId,
    });
  } catch (err) {
    next(err);
  }
};

exports.listProducts = async (req, res, next) => {
  try {
    const {
      shopId,
      query,
      category,
      status,
      minPrice,
      maxPrice,
      sort = '-updatedAt',
      page = 1,
      pageSize = 10,
    } = req.query;

    const match = { isDeleted: { $ne: true } };
    if (shopId && mongoose.Types.ObjectId.isValid(shopId)) {
      match.shop = new mongoose.Types.ObjectId(shopId);
    }
    if (category) match.category = category;
    if (status) {
      const mapped = STATUS_TO_INTERNAL[status] || status;
      match.status = mapped;
    }
    const hasMin = minPrice !== undefined && String(minPrice).trim() !== '';
    const hasMax = maxPrice !== undefined && String(maxPrice).trim() !== '';
    if (hasMin || hasMax) {
      match.price = {};
      if (hasMin) {
        const value = Number(minPrice);
        if (Number.isFinite(value)) {
          match.price.$gte = value;
        }
      }
      if (hasMax) {
        const value = Number(maxPrice);
        if (Number.isFinite(value)) {
          match.price.$lte = value;
        }
      }
      if (!Object.keys(match.price).length) {
        delete match.price;
      }
    }
    const search = sanitizeRegex(query);
    if (search) {
      match.name = search;
    }

    const sortObj = parseSort(sort, '-updatedAt');
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(pageSize, 10) || 10));
    const skip = (pageNum - 1) * limit;

    const pipeline = [
      { $match: match },
      {
        $lookup: {
          from: 'shops',
          localField: 'shop',
          foreignField: '_id',
          as: 'shop',
        },
      },
      { $unwind: '$shop' },
      { $sort: sortObj },
      { $skip: skip },
      { $limit: limit },
    ];

    const [items, totalAgg] = await Promise.all([
      Product.aggregate(pipeline),
      Product.aggregate([
        { $match: match },
        { $count: 'count' },
      ]),
    ]);

    const total = totalAgg[0]?.count || 0;

    res.json({
      ok: true,
      data: {
        items: items.map(normalizeProduct),
        total,
        page: pageNum,
        pageSize: limit,
      },
      traceId: req.traceId,
    });
  } catch (err) {
    next(err);
  }
};

exports.updateProduct = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw AppError.badRequest('INVALID_PRODUCT_ID', 'Invalid product id');
    }

    const product = await Product.findOne({ _id: id, isDeleted: { $ne: true } });
    if (!product) {
      throw AppError.notFound('PRODUCT_NOT_FOUND', 'Product not found');
    }

    const {
      name,
      price,
      mrp,
      stock,
      status,
      category,
      images,
      image,
    } = req.body || {};

    if (name !== undefined) product.name = name;
    if (category !== undefined) product.category = category;
    if (price !== undefined) {
      const value = Number(price);
      if (!(Number.isFinite(value) && value > 0)) {
        throw AppError.badRequest('INVALID_PRICE', 'Price must be greater than zero');
      }
      product.price = value;
    }
    if (mrp !== undefined) {
      const value = Number(mrp);
      if (!(Number.isFinite(value) && value > 0)) {
        throw AppError.badRequest('INVALID_MRP', 'MRP must be greater than zero');
      }
      product.mrp = value;
    }
    if (stock !== undefined) {
      const value = Number(stock);
      if (!Number.isFinite(value) || value < 0) {
        throw AppError.badRequest('INVALID_STOCK', 'Stock must be a positive number');
      }
      product.stock = value;
    }
    if (status !== undefined) {
      const mapped = STATUS_TO_INTERNAL[status] || status;
      if (mapped) product.status = mapped;
    }
    if (image !== undefined) {
      product.image = image;
      if (image && (!Array.isArray(product.images) || !product.images.length)) {
        product.images = [image];
      }
    }
    if (images !== undefined) {
      const list = Array.isArray(images)
        ? images.filter((img) => typeof img === 'string' && img.trim())
        : [];
      product.images = list;
      if (list.length) {
        product.image = list[0];
      } else if (!image) {
        product.image = product.image || null;
      }
    }

    if (req.user?._id) {
      product.updatedBy = req.user._id;
    }

    await product.save();

    const populated = await Product.findById(product._id)
      .populate('shop', 'name')
      .lean();

    res.json({
      ok: true,
      data: normalizeProduct(populated || product.toObject()),
      traceId: req.traceId,
    });
  } catch (err) {
    next(err);
  }
};

exports.deleteProduct = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw AppError.badRequest('INVALID_PRODUCT_ID', 'Invalid product id');
    }

    const product = await Product.findOne({ _id: id, isDeleted: { $ne: true } });
    if (!product) {
      throw AppError.notFound('PRODUCT_NOT_FOUND', 'Product not found');
    }

    product.isDeleted = true;
    product.deletedAt = new Date();
    if (req.user?._id) {
      product.updatedBy = req.user._id;
    }
    await product.save();

    res.json({ ok: true, data: { message: 'Product deleted' }, traceId: req.traceId });
  } catch (err) {
    next(err);
  }
};
