const express = require('express');
const protect = require('../../middleware/authMiddleware');
const ensureAdmin = require('../../middleware/ensureAdmin');
const {
  listServices,
  getServiceProviders,
  listServiceProvidersAlias,
  createServiceRequest,
  getMyServiceRequests,
  getAssignedServiceRequests,
  adminUpdateServiceRequest,
} = require('../../controllers/servicesController');

const router = express.Router();

router.get('/', listServices);
router.get('/providers', listServiceProvidersAlias);
router.get('/:id/providers', getServiceProviders);
router.post('/requests', protect, createServiceRequest);
router.get('/requests/my', protect, getMyServiceRequests);
router.get('/requests/assigned', protect, getAssignedServiceRequests);
router.patch('/requests/:id', protect, ensureAdmin, adminUpdateServiceRequest);

module.exports = router;
