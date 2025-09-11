const express = require('express');
const protect = require('../middleware/authMiddleware');
const {
  listProfessionals,
  getProfessional,
  createServiceOrder,
  updateServiceOrder,
} = require('../controllers/proController');

const router = express.Router();

router.get('/', protect, listProfessionals);
router.post('/orders', protect, createServiceOrder);
router.patch('/orders/:id', protect, updateServiceOrder);
router.get('/:id', protect, getProfessional);

module.exports = router;
