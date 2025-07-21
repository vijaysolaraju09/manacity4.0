const Product = require('../models/Product');
const Shop = require('../models/Shop');

exports.createProduct = async (req, res) => {
  try {
    const { name, description, price, category, image, stock, shopId } = req.body;
    const shop = await Shop.findOne({ _id: shopId, owner: req.user._id });
    if (!shop) return res.status(404).json({ error: 'Shop not found' });

    const product = await Product.create({
      shop: shopId,
      name,
      description,
      price,
      category,
      image,
      stock,
    });
    res.status(201).json(product);
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

    const { name, description, price, category, image, stock } = req.body;
    if (name !== undefined) product.name = name;
    if (description !== undefined) product.description = description;
    if (price !== undefined) product.price = price;
    if (category !== undefined) product.category = category;
    if (image !== undefined) product.image = image;
    if (stock !== undefined) product.stock = stock;
    await product.save();
    res.json(product);
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
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch products' });
  }
};

exports.getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch product' });
  }
};
