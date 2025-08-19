const { NotificationModel } = require("../models/Notification");

// Admin: Create notification for a user
exports.createNotification = async (req, res) => {
  try {
    const { userId, type, title, body, cta } = req.body;
    const notification = await NotificationModel.create({
      userId,
      type,
      title,
      body,
      cta,
    });
    res.status(201).json(notification);
  } catch (err) {
    res.status(500).json({ error: "Failed to create notification" });
  }
};

// User: Get notifications with pagination and filters
exports.getUserNotifications = async (req, res) => {
  try {
    const userId = req.user._id;
    const {
      page = 1,
      limit = 10,
      type,
      unread,
    } = req.query;
    const query = { userId };
    if (type) query.type = type;
    if (unread === "true") query.isRead = false;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const [notifications, total] = await Promise.all([
      NotificationModel.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      NotificationModel.countDocuments(query),
    ]);

    res.json({
      notifications,
      hasMore: skip + notifications.length < total,
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch notifications" });
  }
};

// User: Mark a notification as read
exports.markAsRead = async (req, res) => {
  try {
    const userId = req.user._id;
    const { id } = req.params;
    const result = await NotificationModel.updateOne(
      { _id: id, userId },
      { $set: { isRead: true, readAt: new Date() } }
    );
    if (result.matchedCount === 0) {
      return res.status(404).json({ error: "Notification not found" });
    }
    res.json({ message: "Notification marked as read" });
  } catch (err) {
    res.status(500).json({ error: "Failed to mark as read" });
  }
};
