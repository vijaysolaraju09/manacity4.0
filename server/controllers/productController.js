const Product = require('../models/Product');
const Shop = require('../models/Shop');

const normalize = (p) => ({
  id: p._id.toString(),
  _id: p._id.toString(),
  name: p.name,
  price: p.price,
  mrp: p.mrp,
  discount: p.mrp ? Math.round(((p.mrp - p.price) / p.mrp) * 100) : 0,
  stock: p.stock,
  images: p.images,
  image: p.images?.[0] || '',
  category: p.category,
  shopId: p.shop.toString(),
  shop: p.shop.toString(),
});

exports.createProduct = async (req, res) => {
  try {
    const { name, description, price, mrp, category, images = [], stock, shopId } = req.body;
    if (!name || price === undefined || mrp === undefined) {
      return res.status(400).json({ error: 'Name, price and mrp are required' });
    }
    if (price <= 0 || mrp <= 0) {
      return res.status(400).json({ error: 'Price and MRP must be greater than 0' });
    }

    const shop = shopId
      ? await Shop.findOne({ _id: shopId, owner: req.user._id })
      : await Shop.findOne({ owner: req.user._id });
    if (!shop) return res.status(403).json({ error: 'Not authorized' });

    const product = await Product.create({
      shop: shop._id,
      createdBy: req.user._id,
      name,
      description,
      price,
      mrp,
      category,
      images,
      stock,
    });
    res.status(201).json(normalize(product));
  } catch (err) {
    res.status(500).json({ error: 'Failed to add product' });
  }
};

exports.updateProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    const shop = await Shop.findOne({ _id: product.shop, owner: req.user._id });
    if (!shop) return res.status(403).json({ error: 'Not authorized' });

    const { name, description, price, mrp, category, images, stock } = req.body;
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
    if (images !== undefined) product.images = images;
    if (stock !== undefined) product.stock = stock;
    await product.save();
    res.json(normalize(product));
  } catch (err) {
    res.status(500).json({ error: 'Failed to update product' });
  }
};

exports.deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    const shop = await Shop.findOne({ _id: product.shop, owner: req.user._id });
    if (!shop) return res.status(403).json({ error: 'Not authorized' });

    await product.deleteOne();
    res.json({ message: 'Product deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete product' });
  }
};

exports.getMyProducts = async (req, res) => {
  try {
    const shops = await Shop.find({ owner: req.user._id });
    const shopIds = shops.map((s) => s._id);
    const products = await Product.find({ shop: { $in: shopIds } });
    res.json(products.map(normalize));
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch products' });
  }
};

exports.getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json(normalize(product));
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch product' });
  }
};
