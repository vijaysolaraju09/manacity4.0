const express = require("express");
const router = express.Router();
const protect = require("../middleware/authMiddleware");
const isAdmin = require("../middleware/isAdmin");
const validate = require("../middleware/validate");
const {
  createEventSchema,
  updateEventSchema,
} = require("../validators/eventSchemas");
const {
  createEvent,
  getAllEvents,
  getEventById,
  updateEvent,
  deleteEvent,
  registerForEvent,
} = require("../controllers/eventController");

router.post(
  "/",
  protect,
  isAdmin,
  validate(createEventSchema),
  createEvent
); // Admin only
router.get("/", getAllEvents);
router.get("/:id", getEventById);
router.put(
  "/:id",
  protect,
  isAdmin,
  validate(updateEventSchema),
  updateEvent
); // Admin only
router.delete("/:id", protect, isAdmin, deleteEvent); // Admin only
router.post("/:id/register", protect, registerForEvent);

module.exports = router;
