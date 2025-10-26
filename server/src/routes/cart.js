const express = require('express');
const router = express.Router();
const protect = require('../middleware/authMiddleware');
const {
  getCart,
  addOrUpdateCartItem,
  removeCartItem,
} = require('../controllers/cart');

router.get('/', protect, getCart);
router.post('/', protect, addOrUpdateCartItem);
router.delete('/:productId', protect, removeCartItem);

module.exports = router;
