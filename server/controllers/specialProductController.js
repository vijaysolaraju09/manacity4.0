const SpecialProduct = require("../models/SpecialProduct");

// Get all special shop products
exports.getSpecialProducts = async (req, res) => {
  try {
    const { category, search } = req.query;
    const filter = {};

    if (category) {
      filter.category = category;
    }

    if (search) {
      filter.name = { $regex: search, $options: "i" };
    }

    const products = await SpecialProduct.find(filter).sort({ createdAt: -1 });
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch special products" });
  }
};

// Admin: Add new special product
exports.addSpecialProduct = async (req, res) => {
  try {
    const newProduct = await SpecialProduct.create(req.body);
    res
      .status(201)
      .json({ message: "Special product created", product: newProduct });
  } catch (err) {
    res.status(500).json({ error: "Failed to add product" });
  }
};
