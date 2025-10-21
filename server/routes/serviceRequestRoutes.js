const express = require('express');
const {
  createServiceRequest,
  listMyServiceRequests,
} = require('../controllers/serviceRequestsController');
const protect = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/', protect, createServiceRequest);
router.get('/mine', protect, listMyServiceRequests);

module.exports = router;
