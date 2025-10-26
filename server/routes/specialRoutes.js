const express = require('express');
const {
  getSpecialProducts,
  createSpecialOrderIntent,
} = require('../controllers/specialController');

const router = express.Router();

// Public: fetch curated special products
router.get('/products', getSpecialProducts);
router.get('/', getSpecialProducts);

// Capture "call to order" intents so the team can follow-up
router.post('/orders', createSpecialOrderIntent);

module.exports = router;
