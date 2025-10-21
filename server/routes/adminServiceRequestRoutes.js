const express = require('express');
const {
  adminListServiceRequests,
  adminUpdateServiceRequest,
} = require('../controllers/serviceRequestsController');
const protect = require('../middleware/authMiddleware');
const isAdmin = require('../middleware/isAdmin');

const router = express.Router();

router.get('/', protect, isAdmin, adminListServiceRequests);
router.patch('/:id', protect, isAdmin, adminUpdateServiceRequest);

module.exports = router;
