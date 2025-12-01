const express = require('express');
const protect = require('../middleware/authMiddleware');
const optionalAuth = require('../middleware/optionalAuth');
const ensureAdmin = require('../middleware/ensureAdmin');
const {
  createServiceRequest,
  createDirectRequest,
  listPublicRequests,
  listMyRequests,
  listMyServices,
  getServiceRequest,
  submitOffer,
  acceptOffer,
  rejectOffer,
  acceptDirect,
  rejectDirect,
  updateStatus,
  assignProvider,
} = require('../controllers/servicesModuleController');

const router = express.Router();

router.get('/public', optionalAuth, listPublicRequests);
router.post('/', protect, createServiceRequest);
router.post('/direct', protect, createDirectRequest);
router.get('/my-requests', protect, listMyRequests);
router.get('/my-services', protect, listMyServices);
router.get('/:id', optionalAuth, getServiceRequest);
router.post('/:id/offers', protect, submitOffer);
router.patch('/:id/offers/:offerId/accept', protect, acceptOffer);
router.patch('/:id/offers/:offerId/reject', protect, rejectOffer);
router.patch('/:id/accept-direct', protect, acceptDirect);
router.patch('/:id/reject-direct', protect, rejectDirect);
router.patch('/:id/status', protect, updateStatus);
router.patch('/:id/assign-provider', protect, ensureAdmin, assignProvider);

module.exports = router;
