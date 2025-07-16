const Notification = require("../models/Notification");

// Admin: Create notification
exports.createNotification = async (req, res) => {
  try {
    const { title, message, image, link, type, user } = req.body;

    const newNotif = await Notification.create({
      title,
      message,
      image,
      link,
      type,
      user: user || null,
    });

    res
      .status(201)
      .json({ message: "Notification created", notification: newNotif });
  } catch (err) {
    res.status(500).json({ error: "Failed to create notification" });
  }
};

// User: Get all relevant notifications (global + personal)
exports.getUserNotifications = async (req, res) => {
  try {
    const userId = req.user._id;

    const notifs = await Notification.find({
      $or: [
        { user: null }, // global
        { user: userId }, // personal
      ],
    }).sort({ createdAt: -1 });

    // Exclude viewed ones
    const filtered = notifs.filter((n) => !n.viewedBy.includes(userId));

    res.json(filtered);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch notifications" });
  }
};

// User: Mark one as viewed
exports.markAsViewed = async (req, res) => {
  try {
    const notif = await Notification.findById(req.params.id);
    if (!notif)
      return res.status(404).json({ error: "Notification not found" });

    const userId = req.user._id;
    if (!notif.viewedBy.includes(userId)) {
      notif.viewedBy.push(userId);
      await notif.save();
    }

    res.json({ message: "Notification marked as viewed" });
  } catch (err) {
    res.status(500).json({ error: "Failed to mark as viewed" });
  }
};
