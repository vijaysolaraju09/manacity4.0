const express = require("express");
const router = express.Router();
const protect = require("../middleware/authMiddleware");
const {
  createNotification,
  getUserNotifications,
  markAsRead,
} = require("../controllers/notificationController");

// Admin: add notification for a user
router.post("/", createNotification);

// User: get relevant notifications
router.get("/", protect, getUserNotifications);

// User: mark one as read
router.post("/read/:id", protect, markAsRead);

module.exports = router;
