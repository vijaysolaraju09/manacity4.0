const express = require('express');
const protect = require('../middleware/authMiddleware');
const ensureAdmin = require('../middleware/ensureAdmin');
const {
  listServices,
  getService,
  createService,
  updateService,
  deleteService,
  assignProviders,
} = require('../controllers/servicesModuleController');

const router = express.Router();

router.get('/', listServices);
router.get('/:id', getService);
router.post('/', protect, ensureAdmin, createService);
router.patch('/:id', protect, ensureAdmin, updateService);
router.delete('/:id', protect, ensureAdmin, deleteService);
router.patch('/:id/assign-providers', protect, ensureAdmin, assignProviders);

module.exports = router;
