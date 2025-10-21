const express = require('express');
const {
  listServices,
  createService,
  updateService,
} = require('../controllers/servicesController');
const protect = require('../middleware/authMiddleware');
const isAdmin = require('../middleware/isAdmin');

const router = express.Router();

router.get('/', protect, isAdmin, listServices);
router.post('/', protect, isAdmin, createService);
router.patch('/:id', protect, isAdmin, updateService);

module.exports = router;
