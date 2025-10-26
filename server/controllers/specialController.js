const { isValidObjectId } = require('mongoose');
const SpecialProduct = require('../models/SpecialProduct');
const SpecialOrderIntent = require('../models/SpecialOrderIntent');

// Get curated products flagged as special
exports.getSpecialProducts = async (req, res) => {
  try {
    const products = await SpecialProduct.find({ active: true })
      .sort({ createdAt: -1 })
      .lean();
    res.json({ items: products });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch special products' });
  }
};

exports.createSpecialOrderIntent = async (req, res) => {
  try {
    const { productId, note } = req.body || {};
    const payload = {};

    if (productId) {
      if (!isValidObjectId(productId)) {
        return res.status(400).json({ error: 'Invalid productId' });
      }

      const product = await SpecialProduct.findOne({ _id: productId, active: true }).lean();
      if (!product) {
        return res.status(404).json({ error: 'Special product not found' });
      }

      payload.product = product._id;
      payload.snapshot = {
        title: product.title,
        price: product.price,
        mrp: product.mrp,
        image: product.image,
      };
    }

    if (!payload.product && (!note || typeof note !== 'string' || !note.trim())) {
      return res
        .status(400)
        .json({ error: 'Provide a valid productId or a note describing the request' });
    }

    if (note && typeof note === 'string' && note.trim()) {
      payload.note = note.trim();
    }

    const userId = req.user?.userId || req.user?._id || req.user?.id;
    if (userId && isValidObjectId(userId)) {
      payload.user = userId;
    }

    const intent = await SpecialOrderIntent.create(payload);

    res.status(201).json({ item: intent.toObject({ virtuals: true }) });
  } catch (err) {
    res.status(500).json({ error: 'Failed to record order intent' });
  }
};

