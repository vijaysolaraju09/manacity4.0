const Shop = require('../models/Shop');
const Product = require('../models/Product');
const AppError = require('../utils/AppError');

exports.createShop = async (req, res, next) => {
  try {
    const { name, category, location, address, image, banner, description } = req.body;
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
    return res
      .status(201)
      .json({ ok: true, data: { shop: shop.toCardJSON() }, traceId: req.traceId });
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

exports.updateShop = async (req, res, next) => {
  try {
    const shop = await Shop.findById(req.params.id);
    if (!shop) {
      return next(AppError.notFound('SHOP_NOT_FOUND', 'Shop not found'));
    }

    if (shop.owner.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return next(AppError.forbidden('NOT_AUTHORIZED', 'Not authorized'));
    }

    const fields = ['name', 'category', 'location', 'address', 'image', 'banner', 'description'];
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
    return res.json({ ok: true, data: { shop: shop.toCardJSON() }, traceId: req.traceId });
  } catch (err) {
    return next(err);
  }
};
