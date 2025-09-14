const express = require('express');
const router = express.Router();
const protect = require('../middleware/authMiddleware');
const isAdmin = require('../middleware/isAdmin');
const {
  listEvents,
  createEvent,
  getEvent,
  updateEvent,
  publishEvent,
  startEvent,
  completeEvent,
  cancelEvent,
  register,
  unregister,
  getMyRegistration,
  listRegistrations,
  postUpdate,
  listUpdates,
  getLeaderboard,
  postLeaderboard,
} = require('../controllers/eventController');

// Public
router.get('/', listEvents);
router.get('/:id', getEvent);
router.get('/:id/updates', listUpdates);
router.get('/:id/leaderboard', getLeaderboard);
router.get('/:id/registrations', listRegistrations);

// Authenticated user
router.post('/:id/register', protect, register);
router.delete('/:id/register', protect, unregister);
router.get('/:id/registered/me', protect, getMyRegistration);

// Organizer/Admin
router.post('/', protect, isAdmin, createEvent);
router.patch('/:id', protect, isAdmin, updateEvent);
router.post('/:id/publish', protect, isAdmin, publishEvent);
router.post('/:id/start', protect, isAdmin, startEvent);
router.post('/:id/complete', protect, isAdmin, completeEvent);
router.post('/:id/cancel', protect, isAdmin, cancelEvent);
router.post('/:id/updates', protect, isAdmin, postUpdate);
router.post('/:id/leaderboard', protect, isAdmin, postLeaderboard);

module.exports = router;
