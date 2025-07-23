const Order = require('../models/Order');
const Product = require('../models/Product');

exports.placeOrder = async (req, res) => {
  try {
    let { productId, quantity, businessId, shopId } = req.body;
    productId = productId || req.params.productId;
    if (!productId) return res.status(400).json({ error: 'Product ID required' });

    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ error: 'Product not found' });

    businessId = businessId || product.createdBy;
    shopId = shopId || product.shop;

    const order = await Order.create({
      user: req.user._id,
      business: businessId,
      product: productId,
      shop: shopId,
      quantity,
      status: 'pending',
    });
    res.status(201).json(order);
  } catch (err) {
    res.status(500).json({ error: 'Failed to place order' });
  }
};

exports.getMyOrders = async (req, res) => {
  try {
    let orders = await Order.find({ user: req.user._id })
      .populate({
        path: 'product',
        select: 'name image shop',
        populate: { path: 'shop', select: 'name' },
      })
      .populate('shop', 'name');

    const { status, category, minPrice, maxPrice, search } = req.query;
    if (status) orders = orders.filter((o) => o.status === status);
    if (category) orders = orders.filter((o) => o.product?.category === category);
    if (minPrice) orders = orders.filter((o) => (o.product?.price || 0) >= Number(minPrice));
    if (maxPrice) orders = orders.filter((o) => (o.product?.price || 0) <= Number(maxPrice));
    if (search) {
      const q = search.toLowerCase();
      orders = orders.filter(
        (o) =>
          (o.product?.name || '').toLowerCase().includes(q) ||
          (o.shop?.name || '').toLowerCase().includes(q)
      );
    }
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
};

exports.getReceivedOrders = async (req, res) => {
  try {
    let orders = await Order.find({ business: req.user._id })
      .populate('user', 'name phone')
      .populate('product', 'name category price');

    const { status, category, minPrice, maxPrice, search } = req.query;
    if (status) orders = orders.filter((o) => o.status === status);
    if (category) orders = orders.filter((o) => o.product?.category === category);
    if (minPrice) orders = orders.filter((o) => (o.product?.price || 0) >= Number(minPrice));
    if (maxPrice) orders = orders.filter((o) => (o.product?.price || 0) <= Number(maxPrice));
    if (search) {
      const q = search.toLowerCase();
      orders = orders.filter((o) => (o.product?.name || '').toLowerCase().includes(q));
    }

    const result = orders.map((o) => {
      const item = o.toObject();
      if (item.status !== 'accepted' && item.user) {
        delete item.user.phone;
      }
      return item;
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
};

exports.acceptOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    if (order.business.toString() !== req.user._id.toString())
      return res.status(403).json({ error: 'Not authorized' });
    order.status = 'accepted';
    await order.save();
    res.json(order);
  } catch (err) {
    res.status(500).json({ error: 'Failed to accept order' });
  }
};

exports.rejectOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    if (order.business.toString() !== req.user._id.toString())
      return res.status(403).json({ error: 'Not authorized' });
    order.status = 'rejected';
    await order.save();
    res.json(order);
  } catch (err) {
    res.status(500).json({ error: 'Failed to reject order' });
  }
};

exports.cancelOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    if (order.user.toString() !== req.user._id.toString())
      return res.status(403).json({ error: 'Not authorized' });
    if (order.status !== 'pending')
      return res.status(400).json({ error: 'Cannot cancel now' });
    order.status = 'cancelled';
    await order.save();
    res.json(order);
  } catch (err) {
    res.status(500).json({ error: 'Failed to cancel order' });
  }
};
