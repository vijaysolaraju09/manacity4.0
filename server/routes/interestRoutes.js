const express = require('express');
const router = express.Router();
const protect = require('../middleware/authMiddleware');
const {
  createInterest,
  getMyInterests,
  getReceivedInterests,
  acceptInterest,
  rejectInterest,
  cancelInterest,
} = require('../controllers/interestController');

router.post('/', protect, createInterest);
router.post('/:productId', protect, createInterest);
router.get('/my', protect, getMyInterests);
router.get('/received', protect, getReceivedInterests);
router.post('/:id/accept', protect, acceptInterest);
router.post('/:id/reject', protect, rejectInterest);
router.post('/:id/cancel', protect, cancelInterest);

module.exports = router;
