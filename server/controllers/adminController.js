const User = require('../models/User');
const Order = require('../models/Order');
const { parseQuery } = require('../utils/query');

exports.getUsers = async (req, res) => {
  try {
    const { query, ...rest } = req.query;
    const { limit, skip, sort, filters } = parseQuery(rest, [
      'role',
      'verified',
      'status',
      'createdFrom',
      'createdTo',
    ]);

    const filter = {};
    if (filters.role) filter.role = filters.role;
    if (filters.verified !== undefined)
      filter.isVerified = filters.verified === 'true';
    if (filters.status) {
      if (filters.status === 'active') filter.isActive = true;
      else if (filters.status === 'inactive') filter.isActive = false;
    }
    if (filters.createdFrom || filters.createdTo) {
      const createdAt = {};
      if (filters.createdFrom) {
        const from = new Date(filters.createdFrom);
        if (!Number.isNaN(from.getTime())) {
          createdAt.$gte = from;
        }
      }
      if (filters.createdTo) {
        const to = new Date(filters.createdTo);
        if (!Number.isNaN(to.getTime())) {
          createdAt.$lte = to;
        }
      }
      if (Object.keys(createdAt).length > 0) {
        filter.createdAt = createdAt;
      }
    }
    if (query) {
      filter.$or = [
        { name: { $regex: query, $options: 'i' } },
        { phone: { $regex: query, $options: 'i' } },
      ];
    }

    const sortObj = Object.keys(sort).length ? sort : { createdAt: -1 };

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
      {
        $addFields: {
          ordersCount: { $size: '$orders' },
          isActive: { $ifNull: ['$isActive', true] },
        },
      },
      { $project: { password: 0, orders: 0 } },
      { $sort: sortObj },
      { $skip: skip },
      { $limit: limit },
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
    if (role === 'verified') {
      user.isVerified = true;
      user.verificationStatus = 'approved';
    } else if (role !== 'admin') {
      user.isVerified = false;
      if (user.verificationStatus !== 'none') {
        user.verificationStatus = 'none';
      }
    }
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
    const { limit, skip, sort, filters } = parseQuery(req.query, ['status']);
    const filter = {};
    if (filters.status) filter.status = filters.status;
    const sortObj = Object.keys(sort).length ? sort : { createdAt: -1 };

    const [items, total] = await Promise.all([
      Order.find(filter)
        .sort(sortObj)
        .skip(skip)
        .limit(limit)
        .populate('user', 'name phone')
        .populate('shop', 'name'),
      Order.countDocuments(filter),
    ]);
    res.json({ items, total });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
};
