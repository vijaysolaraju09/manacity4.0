const User = require('../models/User');
const Order = require('../models/Order');

exports.getUsers = async (req, res) => {
  try {
    const {
      role,
      query,
      verified,
      page = 1,
      pageSize = 10,
      sort = '-createdAt',
    } = req.query;

    const filter = {};
    if (role) filter.role = role;
    if (verified !== undefined) filter.isVerified = verified === 'true';
    if (query) {
      filter.$or = [
        { name: { $regex: query, $options: 'i' } },
        { phone: { $regex: query, $options: 'i' } },
      ];
    }

    const skip = (Number(page) - 1) * Number(pageSize);
    const sortObj = {};
    if (sort) {
      if (sort.startsWith('-')) {
        sortObj[sort.slice(1)] = -1;
      } else {
        sortObj[sort] = 1;
      }
    }

    const pipeline = [
      { $match: filter },
      {
        $lookup: {
          from: 'orders',
          localField: '_id',
          foreignField: 'user',
          as: 'orders',
        },
      },
      { $addFields: { ordersCount: { $size: '$orders' } } },
      { $project: { password: 0, orders: 0 } },
      { $sort: sortObj },
      { $skip: skip },
      { $limit: Number(pageSize) },
    ];

    const [items, total] = await Promise.all([
      User.aggregate(pipeline).exec(),
      User.countDocuments(filter),
    ]);

    res.json({ items, total });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
};

exports.updateUserRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;
    const user = await User.findById(id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (user.role === 'admin' && role !== 'admin') {
      const adminCount = await User.countDocuments({ role: 'admin' });
      if (adminCount <= 1) {
        return res.status(400).json({ error: 'Cannot demote last admin' });
      }
    }

    user.role = role;
    if (role === 'verified') user.isVerified = true;
    await user.save();
    res.json({ message: 'Role updated' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update role' });
  }
};

exports.updateUserStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { active } = req.body;
    const user = await User.findById(id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (user.role === 'admin' && active === false) {
      const adminCount = await User.countDocuments({ role: 'admin' });
      if (adminCount <= 1) {
        return res.status(400).json({ error: 'Cannot deactivate last admin' });
      }
    }

    user.isActive = active;
    await user.save();
    res.json({ message: 'Status updated' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update status' });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (user.role === 'admin') {
      const adminCount = await User.countDocuments({ role: 'admin' });
      if (adminCount <= 1) {
        return res.status(400).json({ error: 'Cannot delete last admin' });
      }
    }

    await user.deleteOne();
    res.json({ message: 'User deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete user' });
  }
};

exports.verifyUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    user.isVerified = true;
    await user.save();
    res.json({ message: 'User verified' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to verify user' });
  }
};

exports.getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find()
      .populate('user', 'name phone')
      .populate('shop', 'name');
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
};
