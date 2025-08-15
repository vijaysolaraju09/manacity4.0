const Shop = require("../models/Shop");
const Product = require("../models/Product");
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
    const {
      query: q,
      status,
      page = 1,
      pageSize = 10,
      sort = "-createdAt",
      category,
      location,
    } = req.query;

    const match = {};
    const statusMap = { active: "approved", suspended: "rejected", pending: "pending" };
    if (status) match.status = statusMap[status] || status;
    if (category) match.category = category;
    if (location) match.location = location;

    const pipeline = [
      {
        $lookup: {
          from: "users",
          localField: "owner",
          foreignField: "_id",
          as: "owner",
        },
      },
      { $unwind: "$owner" },
    ];

    if (q) {
      pipeline.push({
        $match: {
          ...match,
          $or: [
            { name: { $regex: q, $options: "i" } },
            { "owner.name": { $regex: q, $options: "i" } },
          ],
        },
      });
    } else {
      pipeline.push({ $match: match });
    }

    pipeline.push(
      {
        $lookup: {
          from: "products",
          localField: "_id",
          foreignField: "shop",
          as: "products",
        },
      },
      { $addFields: { productsCount: { $size: "$products" }, ownerName: "$owner.name" } },
      { $project: { products: 0, owner: 0 } },
    );

    const basePipeline = [...pipeline];

    const sortField = typeof sort === "string" && sort.startsWith("-") ? sort.slice(1) : sort;
    const sortDir = typeof sort === "string" && sort.startsWith("-") ? -1 : 1;

    const resultPipeline = [
      ...basePipeline,
      { $sort: { [sortField]: sortDir } },
      { $skip: (Number(page) - 1) * Number(pageSize) },
      { $limit: Number(pageSize) },
    ];

    const [items, countRes] = await Promise.all([
      Shop.aggregate(resultPipeline),
      Shop.aggregate([...basePipeline, { $count: "total" }]),
    ]);

    const total = countRes[0]?.total || 0;
    const statusMapOut = { approved: "active", rejected: "suspended", pending: "pending" };
    const mapped = items.map((s) => ({
      id: s._id.toString(),
      _id: s._id.toString(),
      name: s.name,
      owner: s.ownerName,
      category: s.category,
      location: s.location,
      status: statusMapOut[s.status] || s.status,
      productsCount: s.productsCount || 0,
      createdAt: s.createdAt,
    }));

    res.json({ items: mapped, total });
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
    const { status, category, location } = req.query;
    const filters = {};
    if (status) filters.status = status;
    if (category) filters.category = category;
    if (location) filters.location = location;

    const shops = await Shop.find(filters).populate("owner", "name phone");
    res.json(shops);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch shop requests" });
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

exports.updateShop = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = { ...req.body };
    if (updates.status) {
      const map = { active: "approved", suspended: "rejected", pending: "pending" };
      updates.status = map[updates.status] || updates.status;
    }
    const shop = await Shop.findByIdAndUpdate(id, updates, { new: true });
    if (!shop) return res.status(404).json({ error: "Shop not found" });
    res.json({ message: "Shop updated" });
  } catch (err) {
    res.status(500).json({ error: "Failed to update shop" });
  }
};

exports.deleteShop = async (req, res) => {
  try {
    const { id } = req.params;
    const shop = await Shop.findByIdAndDelete(id);
    if (!shop) return res.status(404).json({ error: "Shop not found" });
    await Product.deleteMany({ shop: id });
    res.json({ message: "Shop deleted" });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete shop" });
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
