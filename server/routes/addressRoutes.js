const express = require('express');
const protect = require('../middleware/authMiddleware');
const { listAddresses, createAddress } = require('../controllers/addressController');

const router = express.Router();

router.get('/', protect, listAddresses);
router.post('/', protect, createAddress);

module.exports = router;
