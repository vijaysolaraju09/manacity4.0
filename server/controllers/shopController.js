const Shop = require("../models/Shop");
const Product = require("../models/Product");
const User = require("../models/User");
const { promoteToBusiness } = require("./userController");

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
    res.json(products);
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

exports.approveShop = async (req, res) => {
  try {
    const shop = await Shop.findById(req.params.id);
    if (!shop) return res.status(404).json({ error: "Shop not found" });
    shop.status = "approved";
    await shop.save();

    await promoteToBusiness(shop.owner);

    res.json({ message: "Shop approved" });
  } catch (err) {
    res.status(500).json({ error: "Failed to approve shop" });
  }
};

exports.getMyProducts = async (req, res) => {
  try {
    const products = await Product.find({ createdBy: req.user._id });
    res.status(200).json(products);
  } catch (err) {
    res.status(500).json({ message: "Server error fetching products." });
  }
};
