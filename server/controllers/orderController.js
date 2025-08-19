const Order = require('../models/Order');
const Product = require('../models/Product');
const { normalizeProduct } = require('../utils/normalize');
const { parseQuery } = require('../utils/query');

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
    const { status, shop, startDate, endDate, minPrice, maxPrice } = req.query;
    const paginate =
      req.query.page !== undefined ||
      req.query.limit !== undefined ||
      req.query.pageSize !== undefined;

    const { limit, skip } = paginate
      ? parseQuery(req.query)
      : { limit: null, skip: null };

    let query = Order.find({ user: req.user._id })
      .populate({
        path: 'product',
        populate: { path: 'shop', select: 'name image location' },
      })
      .populate('shop', 'name image location');

    if (status) query = query.where('status').equals(status);
    if (paginate) query = query.skip(skip).limit(limit);

    let orders = await query;

    if (shop) {
      const q = shop.toLowerCase();
      orders = orders.filter(
        (o) =>
          (o.product?.shop?.name || '').toLowerCase().includes(q) ||
          (o.shop?.name || '').toLowerCase().includes(q)
      );
    }
    if (startDate) {
      const start = new Date(startDate);
      orders = orders.filter((o) => new Date(o.createdAt) >= start);
    }
    if (endDate) {
      const end = new Date(endDate);
      orders = orders.filter((o) => new Date(o.createdAt) <= end);
    }
    if (minPrice)
      orders = orders.filter((o) => (o.product?.price || 0) >= Number(minPrice));
    if (maxPrice)
      orders = orders.filter((o) => (o.product?.price || 0) <= Number(maxPrice));

    const result = orders.map((o) => {
      const item = o.toObject();
      if (item.product) item.product = normalizeProduct(item.product);
      if (item.shop && item.shop.name) {
        item.shopMeta = {
          id: item.shop._id.toString(),
          name: item.shop.name,
          image: item.shop.image,
          location: item.shop.location,
        };
      }
      return item;
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
};

exports.getReceivedOrders = async (req, res) => {
  try {
    const { status, category, minPrice, maxPrice, search } = req.query;
    const paginate =
      req.query.page !== undefined ||
      req.query.limit !== undefined ||
      req.query.pageSize !== undefined;
    const { limit, skip } = paginate
      ? parseQuery(req.query)
      : { limit: null, skip: null };

    let query = Order.find({ business: req.user._id })
      .populate('user', 'name phone')
      .populate({
        path: 'product',
        select: 'name category price mrp images shop rating',
        populate: { path: 'shop', select: 'name image location' },
      });

    if (status) query = query.where('status').equals(status);
    if (category) query = query.where('product.category').equals(category);
    if (paginate) query = query.skip(skip).limit(limit);

    let orders = await query;

    if (minPrice)
      orders = orders.filter((o) => (o.product?.price || 0) >= Number(minPrice));
    if (maxPrice)
      orders = orders.filter((o) => (o.product?.price || 0) <= Number(maxPrice));
    if (search) {
      const q = search.toLowerCase();
      orders = orders.filter((o) => (o.product?.name || '').toLowerCase().includes(q));
    }

    const result = orders.map((o) => {
      const item = o.toObject();
      if (item.product) item.product = normalizeProduct(item.product);
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

exports.getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('user', 'name phone')
      .populate({
        path: 'product',
        populate: { path: 'shop', select: 'name image location' },
      })
      .populate('shop', 'name image location');

    if (!order) return res.status(404).json({ error: 'Order not found' });

    const isOwner =
      order.user._id.toString() === req.user._id.toString() ||
      order.business.toString() === req.user._id.toString();
    if (!isOwner) return res.status(403).json({ error: 'Not authorized' });

    const item = order.toObject();
    if (item.product) item.product = normalizeProduct(item.product);
    if (item.status !== 'accepted' && item.user) {
      delete item.user.phone;
    }
    if (item.shop && item.shop.name) {
      item.shopMeta = {
        id: item.shop._id.toString(),
        name: item.shop.name,
        image: item.shop.image,
        location: item.shop.location,
      };
    }

    res.json(item);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch order' });
  }
};

exports.acceptOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('user', 'name phone')
      .populate('product', 'name category price image');
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
    const order = await Order.findById(req.params.id)
      .populate('user', 'name')
      .populate('product', 'name category price image');
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
