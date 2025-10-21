const express = require('express');
const {
  createServiceRequest,
  listMyServiceRequests,
  listPublicServiceRequests,
  submitOffer,
  updateOffer,
  completeServiceRequest,
  reopenServiceRequest,
} = require('../controllers/serviceRequestsController');
const protect = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/public', listPublicServiceRequests);
router.post('/', protect, createServiceRequest);
router.get('/mine', protect, listMyServiceRequests);
router.post('/:id/reopen', protect, reopenServiceRequest);
router.post('/:id/complete', protect, completeServiceRequest);
router.post('/:id/offers', protect, submitOffer);
router.patch('/:id/offers/:offerId', protect, updateOffer);

module.exports = router;
