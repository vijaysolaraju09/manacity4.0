const Product = require('../models/Product');

// Get curated products flagged as special
exports.getSpecialProducts = async (req, res) => {
  try {
    const products = await Product.find({ isSpecial: true, available: true })
      .sort({ createdAt: -1 })
      .lean();
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch special products' });
  }
};

