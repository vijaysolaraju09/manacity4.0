const Notification = require('../models/Notification');

exports.getNotifications = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    const [items, total] = await Promise.all([
      Notification.find({ userId: req.user._id })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Notification.countDocuments({ userId: req.user._id }),
    ]);
    res.json({
      notifications: items,
      hasMore: skip + items.length < total,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
};

exports.markAsRead = async (req, res) => {
  try {
    const result = await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { read: true },
      { new: true }
    ).lean();
    if (!result) return res.status(404).json({ error: 'Notification not found' });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Failed to mark as read' });
  }
};
