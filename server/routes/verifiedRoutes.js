const express = require('express');
const {
  requestVerification,
  listVerified,
  getVerifiedById,
  updateMyVerified,
} = require('../controllers/verifiedController');
const protect = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/', listVerified);
router.get('/:id', getVerifiedById);
router.post('/request', protect, requestVerification);
router.patch('/me', protect, updateMyVerified);

module.exports = router;
