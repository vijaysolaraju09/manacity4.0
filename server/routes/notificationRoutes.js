const express = require("express");
const router = express.Router();
const protect = require("../middleware/authMiddleware");
const {
  getNotifications,
  markAsRead,
  deleteNotification,
  clearNotifications,
} = require("../controllers/notificationController");

// User: get relevant notifications
router.get("/", protect, getNotifications);

// User: clear all notifications
router.delete("/", protect, clearNotifications);

// User: mark one as read
router.patch("/:id/read", protect, markAsRead);
router.post("/:id/read", protect, markAsRead);

// User: delete notification
router.delete("/:id", protect, deleteNotification);

module.exports = router;
