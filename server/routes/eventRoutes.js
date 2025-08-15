const express = require("express");
const router = express.Router();
const protect = require("../middleware/authMiddleware");
const {
  createEvent,
  getAllEvents,
  getEventById,
  updateEvent,
  deleteEvent,
  registerForEvent,
} = require("../controllers/eventController");

router.post("/", createEvent); // Admin only (later add admin middleware)
router.get("/", getAllEvents);
router.get("/:id", getEventById);
router.put("/:id", updateEvent); // Admin only
router.delete("/:id", deleteEvent); // Admin only
router.post("/:id/register", protect, registerForEvent);

module.exports = router;
