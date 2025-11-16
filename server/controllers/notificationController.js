const Notification = require('../models/Notification');
const AppError = require('../utils/AppError');

const toNotificationResponse = (doc) => {
  if (!doc || typeof doc !== 'object') return doc;
  const payload = doc.payload && typeof doc.payload === 'object' ? doc.payload : {};
  const redirectUrl = doc.redirectUrl || payload.redirectUrl || null;
  const entityType = doc.entityType || payload.entityType || null;
  const entityId = doc.entityId || payload.entityId || null;
  const targetType = doc.targetType || payload.targetType || entityType || null;
  const targetId = doc.targetId || payload.targetId || entityId || null;
  const targetLink = doc.targetLink || payload.targetLink || redirectUrl || null;
  return {
    ...doc,
    redirectUrl,
    entityType,
    entityId,
    targetType,
    targetId,
    targetLink,
  };
};

exports.getNotifications = async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const pageNumber = Math.max(Number(page) || 1, 1);
    const pageSize = Math.max(Math.min(Number(limit) || 20, 100), 1);
    const skip = (pageNumber - 1) * pageSize;
    const [rawItems, total, unread] = await Promise.all([
      Notification.find({ userId: req.user._id })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(pageSize)
        .lean(),
      Notification.countDocuments({ userId: req.user._id }),
      Notification.countDocuments({ userId: req.user._id, read: false }),
    ]);
    const items = rawItems.map(toNotificationResponse);
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
    res.json({ ok: true, data: { notification: toNotificationResponse(notification) }, traceId: req.traceId });
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
    res.json({ ok: true, data: { notification: toNotificationResponse(notification) }, traceId: req.traceId });
  } catch (err) {
    next(err);
  }
};

exports.clearNotifications = async (req, res, next) => {
  try {
    const result = await Notification.deleteMany({ userId: req.user._id });
    res.json({
      ok: true,
      data: { deletedCount: result?.deletedCount ?? 0 },
      traceId: req.traceId,
    });
  } catch (err) {
    next(err);
  }
};
