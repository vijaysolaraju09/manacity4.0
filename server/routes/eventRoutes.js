const express = require('express');
const router = express.Router();
const protect = require('../middleware/authMiddleware');
const isAdmin = require('../middleware/isAdmin');
const {
  listEvents,
  createEvent,
  getEvent,
  register,
  setLeaderboard,
} = require('../controllers/eventController');

router.get('/', listEvents);
router.post('/', protect, isAdmin, createEvent);
router.get('/:id', getEvent);
router.post('/:id/register', protect, register);
router.post('/:id/leaderboard', protect, isAdmin, setLeaderboard);

module.exports = router;
