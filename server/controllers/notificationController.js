const Notification = require('../models/Notification');
const AppError = require('../utils/AppError');

exports.getNotifications = async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const pageNumber = Math.max(Number(page) || 1, 1);
    const pageSize = Math.max(Math.min(Number(limit) || 20, 100), 1);
    const skip = (pageNumber - 1) * pageSize;
    const [items, total, unread] = await Promise.all([
      Notification.find({ userId: req.user._id })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(pageSize)
        .lean(),
      Notification.countDocuments({ userId: req.user._id }),
      Notification.countDocuments({ userId: req.user._id, read: false }),
    ]);
    res.json({
      ok: true,
      data: {
        items,
        total,
        unread,
        page: pageNumber,
        pageSize,
        hasMore: skip + items.length < total,
      },
      traceId: req.traceId,
    });
  } catch (err) {
    next(err);
  }
};

exports.markAsRead = async (req, res, next) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { read: true },
      { new: true }
    ).lean();
    if (!notification) {
      throw AppError.notFound('NOTIFICATION_NOT_FOUND', 'Notification not found');
    }
    res.json({ ok: true, data: { notification }, traceId: req.traceId });
  } catch (err) {
    next(err);
  }
};

exports.deleteNotification = async (req, res, next) => {
  try {
    const notification = await Notification.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id,
    }).lean();
    if (!notification) {
      throw AppError.notFound('NOTIFICATION_NOT_FOUND', 'Notification not found');
    }
    res.json({ ok: true, data: { notification }, traceId: req.traceId });
  } catch (err) {
    next(err);
  }
};
