const express = require("express");
const router = express.Router();
const protect = require("../middleware/authMiddleware");
const {
  createNotification,
  getUserNotifications,
  markAsViewed,
} = require("../controllers/notificationController");

// Admin: add global or user notification
router.post("/", createNotification);

// User: get relevant notifications
router.get("/", protect, getUserNotifications);

// User: mark one as viewed
router.post("/view/:id", protect, markAsViewed);

module.exports = router;
