const Shop = require('../models/Shop');
const Product = require('../models/Product');
const User = require('../models/User');
const AppError = require('../utils/AppError');
const { normalizeProduct } = require('../utils/normalize');

const ensurePaise = (value, field) => {
  if (typeof value !== 'number' || !Number.isInteger(value)) {
    throw AppError.badRequest('INVALID_PRICE', `${field} must be an integer amount in paise`);
  }
  if (value <= 0) {
    throw AppError.badRequest('INVALID_PRICE', `${field} must be greater than 0`);
  }
  return value;
};

const ensureRupees = (value, field) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    throw AppError.badRequest('INVALID_PRICE', `${field} must be a valid number`);
  }
  if (numeric <= 0) {
    throw AppError.badRequest('INVALID_PRICE', `${field} must be greater than 0`);
  }
  return numeric;
};

const toPrice = (paise) => paise / 100;

exports.createShop = async (req, res, next) => {
  try {
    const { name, category, location, address, image, banner, description } = req.body;
    const existingPending = await Shop.findOne({
      owner: req.user._id,
      status: 'pending',
    }).select('_id');
    if (existingPending) {
      return next(
        AppError.badRequest(
          'SHOP_REQUEST_PENDING',
          'You already have a pending business request',
        )
      );
    }

    const shop = await Shop.create({
      owner: req.user._id,
      name,
      category,
      location,
      address,
      image,
      banner,
      description,
      status: 'pending',
    });
    if (req.user?._id) {
      await User.findByIdAndUpdate(req.user._id, { businessStatus: 'pending' });
    }
    return res
      .status(201)
      .json({ ok: true, data: { shop: shop.toCardJSON() }, traceId: req.traceId });
  } catch (err) {
    return next(err);
  }
};

exports.getMyShops = async (req, res, next) => {
  try {
    const shops = await Shop.find({ owner: req.user._id })
      .sort({ createdAt: -1 })
      .lean();
    return res.json({
      ok: true,
      data: {
        items: shops.map((s) => ({
          id: s._id?.toString(),
          _id: s._id?.toString(),
          status: s.status,
          name: s.name,
          category: s.category,
          location: s.location,
          address: s.address || '',
          description: s.description || '',
          image: s.image || null,
          isOpen: typeof s.isOpen === 'boolean' ? s.isOpen : true,
        })),
        shops: shops.map((s) => ({
          id: s._id?.toString(),
          _id: s._id?.toString(),
          status: s.status,
          name: s.name,
          category: s.category,
          location: s.location,
          address: s.address || '',
          description: s.description || '',
          image: s.image || null,
          isOpen: typeof s.isOpen === 'boolean' ? s.isOpen : true,
        })),
      },
      traceId: req.traceId,
    });
  } catch (err) {
    return next(err);
  }
};

exports.getAllShops = async (req, res, next) => {
  try {
    const {
      q,
      category,
      location,
      status,
      sort = '-createdAt',
      page = 1,
      pageSize = 10,
    } = req.query;

    const filter = {};
    if (q) filter.name = { $regex: q, $options: 'i' };
    if (category) filter.category = category;
    if (location) filter.location = location;
    if (status) {
      const map = { active: 'approved', suspended: 'rejected' };
      filter.status = map[status] || status;
    }

    const sortField = sort === 'rating' ? '-ratingAvg' : sort;
    const skip = (Number(page) - 1) * Number(pageSize);

    const query = Shop.find(filter).sort(sortField).skip(skip).limit(Number(pageSize));
    const [shops, total] = await Promise.all([
      query,
      Shop.countDocuments(filter),
    ]);

    return res.json({
      ok: true,
      data: {
        items: shops.map((s) => s.toCardJSON()),
        total,
        page: Number(page),
        pageSize: Number(pageSize),
      },
      traceId: req.traceId,
    });
  } catch (err) {
    return next(err);
  }
};

exports.getShopById = async (req, res, next) => {
  try {
    const shop = await Shop.findById(req.params.id);
    if (!shop) {
      return next(AppError.notFound('SHOP_NOT_FOUND', 'Shop not found'));
    }
    return res.json({ ok: true, data: { shop: shop.toCardJSON() }, traceId: req.traceId });
  } catch (err) {
    return next(err);
  }
};

exports.getProductsByShop = async (req, res, next) => {
  try {
    const products = await Product.find({ shop: req.params.id, isDeleted: false }).lean();
    return res.json({ ok: true, data: { items: products }, traceId: req.traceId });
  } catch (err) {
    return next(err);
  }
};

exports.updateShopProduct = async (req, res, next) => {
  try {
    const { shopId, productId } = req.params;

    const shop = await Shop.findById(shopId).select('owner location');
    if (!shop) {
      return next(AppError.notFound('SHOP_NOT_FOUND', 'Shop not found'));
    }

    if (shop.owner.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return next(AppError.forbidden('NOT_AUTHORIZED', 'Not authorized'));
    }

    const product = await Product.findOne({ _id: productId, shop: shopId, isDeleted: false });
    if (!product) {
      return next(AppError.notFound('PRODUCT_NOT_FOUND', 'Product not found'));
    }

    const update = {};

    const {
      name,
      description,
      category,
      pricePaise,
      mrpPaise,
      price,
      mrp,
      imageUrl,
      stock,
      status,
      available,
      isSpecial,
    } = req.body || {};

    if (name !== undefined) update.name = name;
    if (description !== undefined) update.description = description;
    if (category !== undefined) update.category = category;

    if (pricePaise !== undefined) {
      const ensured = ensurePaise(pricePaise, 'Price');
      update.price = toPrice(ensured);
    } else if (price !== undefined) {
      update.price = ensureRupees(price, 'Price');
    }

    if (mrpPaise !== undefined) {
      const ensured = ensurePaise(mrpPaise, 'MRP');
      update.mrp = toPrice(ensured);
    } else if (mrp !== undefined) {
      update.mrp = ensureRupees(mrp, 'MRP');
    }

    const nextPrice = update.price !== undefined ? update.price : product.price;
    const nextMrp = update.mrp !== undefined ? update.mrp : product.mrp;
    if (nextPrice && nextMrp && nextPrice > nextMrp) {
      return next(AppError.badRequest('INVALID_PRICE', 'Price cannot exceed MRP'));
    }

    if (update.price !== undefined || update.mrp !== undefined) {
      update.discount = nextMrp > 0 ? Math.round(((nextMrp - nextPrice) / nextMrp) * 100) : 0;
    }

    if (imageUrl !== undefined) {
      const trimmed = typeof imageUrl === 'string' ? imageUrl.trim() : '';
      update.image = trimmed || undefined;
      update.images = trimmed ? [trimmed] : [];
    }

    if (stock !== undefined) {
      const numericStock = Number(stock);
      if (!Number.isFinite(numericStock) || numericStock < 0) {
        return next(AppError.badRequest('INVALID_STOCK', 'Stock must be a non-negative number'));
      }
      update.stock = numericStock;
    }

    if (status !== undefined) update.status = status;
    if (available !== undefined) update.available = available;
    if (isSpecial !== undefined) update.isSpecial = isSpecial;

    update.updatedBy = req.user._id;
    if (shop.location) {
      update.city = shop.location;
    }

    const updatedProduct = await Product.findOneAndUpdate(
      { _id: productId, shop: shopId, isDeleted: false },
      update,
      { new: true, runValidators: true }
    );

    if (!updatedProduct) {
      return next(AppError.notFound('PRODUCT_NOT_FOUND', 'Product not found'));
    }

    return res.json({
      ok: true,
      data: { product: normalizeProduct(updatedProduct) },
      traceId: req.traceId,
    });
  } catch (err) {
    return next(err);
  }
};

exports.updateShop = async (req, res, next) => {
  try {
    const shop = await Shop.findById(req.params.id);
    if (!shop) {
      return next(AppError.notFound('SHOP_NOT_FOUND', 'Shop not found'));
    }

    if (shop.owner.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return next(AppError.forbidden('NOT_AUTHORIZED', 'Not authorized'));
    }

    const fields = [
      'name',
      'category',
      'location',
      'address',
      'image',
      'banner',
      'description',
      'isOpen',
    ];
    for (const f of fields) {
      if (req.body[f] !== undefined) shop[f] = req.body[f];
    }

    await shop.save();
    return res.json({ ok: true, data: { shop: shop.toCardJSON() }, traceId: req.traceId });
  } catch (err) {
    return next(err);
  }
};

exports.deleteShop = async (req, res, next) => {
  try {
    const shop = await Shop.findById(req.params.id);
    if (!shop) {
      return next(AppError.notFound('SHOP_NOT_FOUND', 'Shop not found'));
    }

    if (shop.owner.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return next(AppError.forbidden('NOT_AUTHORIZED', 'Not authorized'));
    }

    await Product.deleteMany({ shop: shop._id });
    await shop.deleteOne();
    return res.json({ ok: true, data: { message: 'Shop deleted' }, traceId: req.traceId });
  } catch (err) {
    return next(err);
  }
};

exports.approveShop = async (req, res, next) => {
  try {
    const shop = await Shop.findById(req.params.id);
    if (!shop) {
      return next(AppError.notFound('SHOP_NOT_FOUND', 'Shop not found'));
    }
    shop.status = 'approved';
    await shop.save();
    if (shop.owner) {
      await User.findByIdAndUpdate(shop.owner, {
        businessStatus: 'approved',
        role: 'business',
      });
    }
    return res.json({ ok: true, data: { shop: shop.toCardJSON() }, traceId: req.traceId });
  } catch (err) {
    return next(err);
  }
};

exports.rejectShop = async (req, res, next) => {
  try {
    const shop = await Shop.findById(req.params.id);
    if (!shop) {
      return next(AppError.notFound('SHOP_NOT_FOUND', 'Shop not found'));
    }
    shop.status = 'rejected';
    await shop.save();
    if (shop.owner) {
      await User.findByIdAndUpdate(shop.owner, { businessStatus: 'rejected' });
    }
    return res.json({ ok: true, data: { shop: shop.toCardJSON() }, traceId: req.traceId });
  } catch (err) {
    return next(err);
  }
};
