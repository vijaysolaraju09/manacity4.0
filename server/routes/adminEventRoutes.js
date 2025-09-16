const express = require('express');
const {
  listEvents,
  createEvent,
  updateEvent,
  deleteEvent,
} = require('../controllers/adminEventController');
const protect = require('../middleware/authMiddleware');
const isAdmin = require('../middleware/isAdmin');
const validate = require('../middleware/validate');
const { createEventSchema, updateEventSchema } = require('../validators/eventSchemas');

const router = express.Router();

router.use(protect, isAdmin);

router.get('/', listEvents);
router.post('/', validate(createEventSchema), createEvent);
router.put('/:id', validate(updateEventSchema), updateEvent);
router.delete('/:id', deleteEvent);

module.exports = router;
