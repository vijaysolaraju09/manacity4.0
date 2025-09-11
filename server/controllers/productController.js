const Product = require('../models/Product');
const Shop = require('../models/Shop');

const normalize = (p) => ({
  id: p._id.toString(),
  _id: p._id.toString(),
  name: p.name,
  price: p.price,
  mrp: p.mrp,
  discount: p.discount,
  image: p.image,
  category: p.category,
  stock: p.stock,
  available: p.available,
  isSpecial: p.isSpecial,
  status: p.status,
  shopId: typeof p.shop === 'object' ? p.shop._id.toString() : p.shop.toString(),
  shopName: typeof p.shop === 'object' ? p.shop.name : undefined,
  updatedAt: p.updatedAt,
});

exports.createProduct = async (req, res, next) => {
  try {
    const {
      name,
      description,
      price,
      mrp,
      category,
      image,
      stock,
      status,
      available,
      isSpecial,
      shopId,
    } = req.body;
    if (!name || price === undefined || mrp === undefined) {
      return res.status(400).json({ error: 'Name, price and mrp are required' });
    }
    if (price <= 0 || mrp <= 0) {
      return res.status(400).json({ error: 'Price and MRP must be greater than 0' });
    }

    const shop = await Shop.findOne({ _id: shopId, owner: req.user._id });
    if (!shop) return res.status(403).json({ error: 'Not authorized' });

    const product = await Product.create({
      shop: shop._id,
      createdBy: req.user._id,
      updatedBy: req.user._id,
      name,
      description,
      price,
      mrp,
      category,
      image,
      stock,
      status,
      available,
      isSpecial,
      city: shop.location,
    });
    res.status(201).json(normalize(product));
  } catch (err) {
    return next(err);
  }
};

exports.updateProduct = async (req, res, next) => {
  try {
    const product = await Product.findOne({ _id: req.params.id, isDeleted: false });
    if (!product) return res.status(404).json({ error: 'Product not found' });
    if (req.user.role !== 'admin') {
      const shop = await Shop.findOne({ _id: product.shop, owner: req.user._id });
      if (!shop) return res.status(403).json({ error: 'Not authorized' });
    }

    const {
      name,
      description,
      price,
      mrp,
      category,
      image,
      stock,
      status,
      available,
      isSpecial,
    } = req.body;
    if (name !== undefined) product.name = name;
    if (description !== undefined) product.description = description;
    if (price !== undefined) {
      if (price <= 0) {
        return res.status(400).json({ error: 'Price must be greater than 0' });
      }
      product.price = price;
    }
    if (mrp !== undefined) {
      if (mrp <= 0) {
        return res.status(400).json({ error: 'MRP must be greater than 0' });
      }
      product.mrp = mrp;
    }
    if (category !== undefined) product.category = category;
    if (image !== undefined) product.image = image;
    if (stock !== undefined) product.stock = stock;
    if (status !== undefined) product.status = status;
    if (available !== undefined) product.available = available;
    if (isSpecial !== undefined) product.isSpecial = isSpecial;
    product.updatedBy = req.user._id;
    await product.save();
    res.json(normalize(product));
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
    res.json({ message: 'Product deleted' });
  } catch (err) {
    return next(err);
  }
};

exports.getProducts = async (req, res, next) => {
  try {
    const { shopId, query, category, status, minPrice, maxPrice, city, available, isSpecial } = req.query;
    const filter = { isDeleted: false };
    if (shopId) filter.shop = shopId;
    if (category) filter.category = category;
    if (status) filter.status = status;
    if (city) filter.city = city;
    if (available !== undefined) filter.available = available === 'true';
    if (isSpecial !== undefined) filter.isSpecial = isSpecial === 'true';
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = Number(minPrice);
      if (maxPrice) filter.price.$lte = Number(maxPrice);
    }
    if (query) filter.name = { $regex: query, $options: 'i' };

    const items = await Product.find(filter).populate('shop', 'name').lean();
    res.json(items.map(normalize));
  } catch (err) {
    return next(err);
  }
};

exports.getMyProducts = async (req, res, next) => {
  try {
    const shops = await Shop.find({ owner: req.user._id });
    const shopIds = shops.map((s) => s._id);
    const products = await Product.find({ shop: { $in: shopIds }, isDeleted: false }).lean();
    res.json(products.map(normalize));
  } catch (err) {
    return next(err);
  }
};

exports.getProductById = async (req, res, next) => {
  try {
    const product = await Product.findOne({ _id: req.params.id, isDeleted: false }).lean();
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json(normalize(product));
  } catch (err) {
    return next(err);
  }
};
