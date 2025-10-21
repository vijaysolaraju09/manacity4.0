const express = require('express');
const {
  listServices,
  getServiceProviders,
  listServiceProvidersAlias,
} = require('../controllers/servicesController');

const router = express.Router();

router.get('/', listServices);
router.get('/providers', listServiceProvidersAlias);
router.get('/:id/providers', getServiceProviders);

module.exports = router;
