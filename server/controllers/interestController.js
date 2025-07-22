const Interest = require('../models/Interest');
const Product = require('../models/Product');
const Shop = require('../models/Shop');

exports.createInterest = async (req, res) => {
  try {
    let { productId, quantity, businessId, shopId } = req.body;
    productId = productId || req.params.productId;

    if (!productId) {
      return res.status(400).json({ error: 'Product ID required' });
    }

    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ error: 'Product not found' });

    businessId = businessId || product.createdBy;
    shopId = shopId || product.shop;

    const interest = await Interest.create({
      userId: req.user._id,
      businessId,
      productId,
      shopId,
      quantity,
      status: 'pending',
    });
    res.status(201).json(interest);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create interest' });
  }
};

exports.getMyInterests = async (req, res) => {
  try {
    const interests = await Interest.find({ userId: req.user._id })
      .populate('productId')
      .populate('shopId');
    res.json(interests);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch interests' });
  }
};

exports.getReceivedInterests = async (req, res) => {
  try {
    const interests = await Interest.find({ businessId: req.user._id })
      .populate('userId', 'name phone')
      .populate('productId');
    res.json(interests);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch interests' });
  }
};

exports.acceptInterest = async (req, res) => {
  try {
    const interest = await Interest.findById(req.params.id);
    if (!interest) return res.status(404).json({ error: 'Interest not found' });
    if (interest.businessId.toString() !== req.user._id.toString())
      return res.status(403).json({ error: 'Not authorized' });
    interest.status = 'completed';
    await interest.save();
    res.json(interest);
  } catch (err) {
    res.status(500).json({ error: 'Failed to accept interest' });
  }
};

exports.rejectInterest = async (req, res) => {
  try {
    const interest = await Interest.findById(req.params.id);
    if (!interest) return res.status(404).json({ error: 'Interest not found' });
    if (interest.businessId.toString() !== req.user._id.toString())
      return res.status(403).json({ error: 'Not authorized' });
    interest.status = 'rejected';
    await interest.save();
    res.json(interest);
  } catch (err) {
    res.status(500).json({ error: 'Failed to reject interest' });
  }
};

exports.cancelInterest = async (req, res) => {
  try {
    const interest = await Interest.findById(req.params.id);
    if (!interest) return res.status(404).json({ error: 'Interest not found' });
    if (interest.userId.toString() !== req.user._id.toString())
      return res.status(403).json({ error: 'Not authorized' });
    if (interest.status !== 'pending')
      return res.status(400).json({ error: 'Cannot cancel now' });
    interest.status = 'cancelled';
    await interest.save();
    res.json(interest);
  } catch (err) {
    res.status(500).json({ error: 'Failed to cancel interest' });
  }
};
