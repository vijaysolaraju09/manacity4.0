const express = require('express');
const {
  listEvents,
  getEvent,
  createEvent,
  updateEvent,
  deleteEvent,
  publishEvent,
  startEvent,
  completeEvent,
  cancelEvent,
} = require('../controllers/adminEventController');
const protect = require('../middleware/authMiddleware');
const isAdmin = require('../middleware/isAdmin');
const validate = require('../middleware/validate');
const { createEventSchema, updateEventSchema } = require('../validators/eventSchemas');

const router = express.Router();

router.use(protect, isAdmin);

router.get('/', listEvents);
router.get('/:id', getEvent);
router.post('/', validate(createEventSchema), createEvent);
router.put('/:id', validate(updateEventSchema), updateEvent);
router.delete('/:id', deleteEvent);
router.put('/:id/publish', publishEvent);
router.post('/:id/start', startEvent);
router.post('/:id/complete', completeEvent);
router.post('/:id/cancel', cancelEvent);

module.exports = router;
