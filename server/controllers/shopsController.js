const Shop = require('../models/Shop');
const Product = require('../models/Product');

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
    return res.status(201).json({ ok: true, data: { shop }, traceId: req.traceId });
  } catch (err) {
    return next(err);
  }
};

exports.getAllShops = async (req, res, next) => {
  try {
    const shops = await Shop.find({}).lean();
    return res.json({ ok: true, data: { items: shops }, traceId: req.traceId });
  } catch (err) {
    return next(err);
  }
};

exports.getShopById = async (req, res, next) => {
  try {
    const shop = await Shop.findById(req.params.id).lean();
    if (!shop) {
      return res
        .status(404)
        .json({ ok: false, error: { code: 'NOT_FOUND', message: 'Shop not found' }, traceId: req.traceId });
    }
    return res.json({ ok: true, data: { shop }, traceId: req.traceId });
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
      return res
        .status(404)
        .json({ ok: false, error: { code: 'NOT_FOUND', message: 'Shop not found' }, traceId: req.traceId });
    }

    if (shop.owner.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res
        .status(403)
        .json({ ok: false, error: { code: 'FORBIDDEN', message: 'Not authorized' }, traceId: req.traceId });
    }

    const fields = ['name', 'category', 'location', 'address', 'image', 'banner', 'description'];
    for (const f of fields) {
      if (req.body[f] !== undefined) shop[f] = req.body[f];
    }

    await shop.save();
    return res.json({ ok: true, data: { shop }, traceId: req.traceId });
  } catch (err) {
    return next(err);
  }
};

exports.deleteShop = async (req, res, next) => {
  try {
    const shop = await Shop.findById(req.params.id);
    if (!shop) {
      return res
        .status(404)
        .json({ ok: false, error: { code: 'NOT_FOUND', message: 'Shop not found' }, traceId: req.traceId });
    }

    if (shop.owner.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res
        .status(403)
        .json({ ok: false, error: { code: 'FORBIDDEN', message: 'Not authorized' }, traceId: req.traceId });
    }

    await Product.deleteMany({ shop: shop._id });
    await shop.deleteOne();
    return res.json({ ok: true, data: { message: 'Shop deleted' }, traceId: req.traceId });
  } catch (err) {
    return next(err);
  }
};
