const express = require('express');
const {
  createServiceRequest,
  listMyServiceRequests,
  getServiceRequestById,
  listPublicServiceRequests,
  submitOffer,
  updateOffer,
  completeServiceRequest,
  reopenServiceRequest,
  cancelServiceRequest,
  acceptPublicServiceRequest,
  adminUpdateServiceRequest,
  adminListServiceRequests,
} = require('../controllers/serviceRequestsController');
const protect = require('../middleware/authMiddleware');
const optionalAuth = require('../middleware/optionalAuth');
const isAdmin = require('../middleware/isAdmin');

const router = express.Router();

router.get('/', protect, isAdmin, adminListServiceRequests);
router.get('/public', optionalAuth, listPublicServiceRequests);
router.post('/', protect, createServiceRequest);
router.get('/mine', protect, listMyServiceRequests);
router.get('/me', protect, listMyServiceRequests);
router.get('/:id', protect, getServiceRequestById);
router.patch('/:id/accept', protect, acceptPublicServiceRequest);
router.post('/:id/reopen', protect, reopenServiceRequest);
router.post('/:id/complete', protect, completeServiceRequest);
router.post('/:id/cancel', protect, cancelServiceRequest);
router.patch('/:id', protect, isAdmin, adminUpdateServiceRequest);
router.post('/:id/offers', protect, submitOffer);
router.patch('/:id/offers/:offerId', protect, updateOffer);

module.exports = router;
