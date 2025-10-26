const express = require('express');
const protect = require('../middleware/authMiddleware');
const {
  listAddresses,
  listMyAddresses,
  createAddress,
  markDefaultAddress,
} = require('../controllers/addressController');

const router = express.Router();

router.get('/', protect, listAddresses);
router.get('/my', protect, listMyAddresses);
router.post('/', protect, createAddress);
router.patch('/:id/default', protect, markDefaultAddress);

module.exports = router;
