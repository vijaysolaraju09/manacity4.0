const Cart = require("../models/Cart");
const Product = require("../models/Product");

exports.addToCart = async (req, res) => {
  try {
    const { productId, quantity } = req.body;
    const user = req.user._id;

    const product = await Product.findById(productId).populate("shop");
    if (!product) return res.status(404).json({ error: "Product not found" });

    const existing = await Cart.findOne({ user, product: productId });
    if (existing) {
      existing.quantity += quantity || 1;
      await existing.save();
      return res.json({ message: "Quantity updated", cart: existing });
    }

    const newItem = await Cart.create({
      user,
      shop: product.shop._id,
      product: productId,
      quantity: quantity || 1,
    });

    res.status(201).json({ message: "Item added to cart", cart: newItem });
  } catch (err) {
    res.status(500).json({ error: "Failed to add to cart" });
  }
};

exports.getMyCart = async (req, res) => {
  try {
    const items = await Cart.find({ user: req.user._id })
      .populate("product")
      .populate("shop");

    const grouped = {};

    for (let item of items) {
      const shopId = item.shop._id;
      if (!grouped[shopId]) {
        grouped[shopId] = {
          shop: item.shop,
          products: [],
        };
      }
      grouped[shopId].products.push({
        _id: item._id,
        product: item.product,
        quantity: item.quantity,
      });
    }

    res.json(grouped);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch cart" });
  }
};

exports.removeFromCart = async (req, res) => {
  try {
    const cartItem = await Cart.findOneAndDelete({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!cartItem)
      return res.status(404).json({ error: "Cart item not found" });
    res.json({ message: "Item removed" });
  } catch (err) {
    res.status(500).json({ error: "Failed to remove item" });
  }
};
