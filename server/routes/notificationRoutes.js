const express = require("express");
const router = express.Router();
const protect = require("../middleware/authMiddleware");
const { getNotifications, markAsRead } = require("../controllers/notificationController");

// User: get relevant notifications
router.get("/", protect, getNotifications);

// User: mark one as read
router.patch("/:id/read", protect, markAsRead);

module.exports = router;
