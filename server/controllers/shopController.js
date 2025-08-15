const Shop = require("../models/Shop");
const Product = require("../models/Product");
const User = require("../models/User");
const Notification = require("../models/Notification");
const { promoteToBusiness } = require("./userController");

const normalizeProduct = (p) => ({
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

exports.createShop = async (req, res) => {
  try {
    const { name, category, location, address, image, banner, description } = req.body;
    const owner = req.user._id;

    const shop = await Shop.create({
      name,
      category,
      location,
      address,
      image,
      owner,
      banner,
      description,
      status: "pending",
    });
    res.status(201).json({ message: "Shop created", shop });
  } catch (err) {
    res.status(500).json({ error: "Failed to create shop" });
  }
};

exports.getAllShops = async (req, res) => {
  try {
    const { status, category } = req.query;
    const filters = {};

    if (status) filters.status = status;
    if (category) filters.category = category;

    const shops = await Shop.find(filters);
    res.json(shops);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch shops" });
  }
};

exports.getShopById = async (req, res) => {
  try {
    const shop = await Shop.findById(req.params.id);
    if (!shop) return res.status(404).json({ error: "Shop not found" });
    res.json(shop);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch shop" });
  }
};

exports.getProductsByShop = async (req, res) => {
  try {
    const products = await Product.find({ shop: req.params.id });
    res.json(products.map(normalizeProduct));
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch products" });
  }
};

exports.getPendingShops = async (req, res) => {
  try {
    const shops = await Shop.find({ status: "pending" }).populate(
      "owner",
      "name phone"
    );
    res.json(shops);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch pending shops" });
  }
};

exports.getMyShop = async (req, res) => {
  try {
    const shop = await Shop.findOne({ owner: req.user._id });
    if (!shop) return res.status(404).json({ message: "No shop request" });
    res.json(shop);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch shop" });
  }
};

exports.approveShop = async (req, res) => {
  try {
    const shop = await Shop.findById(req.params.id);
    if (!shop) return res.status(404).json({ error: "Shop not found" });
    shop.status = "approved";
    await shop.save();

    await promoteToBusiness(shop.owner);

    await Notification.create({
      title: "Business request approved",
      message: "Your business request has been approved.",
      type: "shop",
      user: shop.owner,
    });

    res.json({ message: "Shop approved" });
  } catch (err) {
    res.status(500).json({ error: "Failed to approve shop" });
  }
};

exports.rejectShop = async (req, res) => {
  try {
    const shop = await Shop.findById(req.params.id);
    if (!shop) return res.status(404).json({ error: "Shop not found" });
    shop.status = "rejected";
    await shop.save();

    await Notification.create({
      title: "Business request rejected",
      message: "Your business request has been rejected.",
      type: "shop",
      user: shop.owner,
    });

    res.json({ message: "Shop rejected" });
  } catch (err) {
    res.status(500).json({ error: "Failed to reject shop" });
  }
};

exports.getMyProducts = async (req, res) => {
  try {
    const products = await Product.find({ createdBy: req.user._id });
    res.status(200).json(products.map(normalizeProduct));
  } catch (err) {
    res.status(500).json({ message: "Server error fetching products." });
  }
};
