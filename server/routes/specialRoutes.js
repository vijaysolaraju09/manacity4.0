const express = require('express');
const { getSpecialProducts } = require('../controllers/specialController');

const router = express.Router();

// Public: fetch curated special products
router.get('/', getSpecialProducts);

module.exports = router;
