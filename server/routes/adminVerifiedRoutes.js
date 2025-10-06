const express = require('express');
const {
  approveVerified,
  rejectVerified,
  updateVerificationRequestStatus,
} = require('../controllers/verifiedController');
const protect = require('../middleware/authMiddleware');
const isAdmin = require('../middleware/isAdmin');

const router = express.Router();

router.post('/:id/approve', protect, isAdmin, approveVerified);
router.post('/:id/reject', protect, isAdmin, rejectVerified);
router.patch('/:id/status', protect, isAdmin, updateVerificationRequestStatus);

module.exports = router;
