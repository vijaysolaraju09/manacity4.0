const Order = require("../models/Order");
const User = require("../models/User");

// Customer: view my orders
exports.getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({ customer: req.user._id }).populate(
      "shop",
      "name phone location address"
    );
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch your orders" });
  }
};

// Business: view orders received
exports.getReceivedOrders = async (req, res) => {
  try {
    const orders = await Order.find({ shop: req.user._id }).populate(
      "customer",
      "name phone location address"
    );
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch received orders" });
  }
};

// Business: accept order
exports.acceptOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ error: "Order not found" });
    if (order.shop.toString() !== req.user._id.toString())
      return res.status(403).json({ error: "Not authorized" });

    order.status = "accepted";
    await order.save();
    res.json({ message: "Order accepted", order });
  } catch (err) {
    res.status(500).json({ error: "Failed to accept order" });
  }
};
