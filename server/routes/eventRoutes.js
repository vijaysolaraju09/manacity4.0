const express = require('express');
const router = express.Router();
const protect = require('../middleware/authMiddleware');
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
  seedBracket,
  getBracket,
  reportMatch,
  verifyMatch,
} = require('../controllers/eventController');

// Public
router.get('/', listEvents);
router.get('/:id', getEvent);
router.get('/:id/updates', listUpdates);
router.get('/:id/leaderboard', getLeaderboard);
router.get('/:id/registrations', listRegistrations);
router.get('/:id/bracket', getBracket);

// Authenticated user
router.post('/:id/register', protect, register);
router.delete('/:id/register', protect, unregister);
router.get('/:id/registered/me', protect, getMyRegistration);
router.post('/matches/:matchId/report', protect, reportMatch);

// Organizer/Admin
router.post('/', protect, createEvent);
router.patch('/:id', protect, updateEvent);
router.post('/:id/publish', protect, publishEvent);
router.post('/:id/start', protect, startEvent);
router.post('/:id/complete', protect, completeEvent);
router.post('/:id/cancel', protect, cancelEvent);
router.post('/:id/updates', protect, postUpdate);
router.post('/:id/leaderboard', protect, postLeaderboard);
router.post('/:id/bracket/seed', protect, seedBracket);
router.post('/matches/:matchId/verify', protect, verifyMatch);

module.exports = router;
