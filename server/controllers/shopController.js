const { ShopModel: Shop } = require('../models/Shop');
const Product = require('../models/Product');

exports.createShop = async (req, res) => {
  try {
    const { name, category, location, address, image, banner, description } = req.body;
    const shop = await Shop.create({
      ownerId: req.user._id,
      name,
      category,
      location,
      address,
      image,
      banner,
      description,
    });
    res.status(201).json(shop);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create shop' });
  }
};

exports.getAllShops = async (req, res) => {
  try {
    const shops = await Shop.find({}).lean();
    res.json(shops);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch shops' });
  }
};

exports.getShopById = async (req, res) => {
  try {
    const shop = await Shop.findById(req.params.id).lean();
    if (!shop) return res.status(404).json({ error: 'Shop not found' });
    res.json(shop);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch shop' });
  }
};

exports.getProductsByShop = async (req, res) => {
  try {
    const products = await Product.find({ shop: req.params.id, isDeleted: false }).lean();
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch products' });
  }
};

exports.updateShop = async (req, res) => {
  try {
    const shop = await Shop.findById(req.params.id);
    if (!shop) return res.status(404).json({ error: 'Shop not found' });
    if (
      shop.ownerId.toString() !== req.user._id.toString() &&
      req.user.role !== 'admin'
    ) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    const { name, category, location, address, image, banner, description } = req.body;
    if (name !== undefined) shop.name = name;
    if (category !== undefined) shop.category = category;
    if (location !== undefined) shop.location = location;
    if (address !== undefined) shop.address = address;
    if (image !== undefined) shop.image = image;
    if (banner !== undefined) shop.banner = banner;
    if (description !== undefined) shop.description = description;
    await shop.save();
    res.json(shop);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update shop' });
  }
};

exports.deleteShop = async (req, res) => {
  try {
    const shop = await Shop.findById(req.params.id);
    if (!shop) return res.status(404).json({ error: 'Shop not found' });
    if (
      shop.ownerId.toString() !== req.user._id.toString() &&
      req.user.role !== 'admin'
    ) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    await Product.deleteMany({ shop: shop._id });
    await shop.deleteOne();
    res.json({ message: 'Shop deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete shop' });
  }
};
