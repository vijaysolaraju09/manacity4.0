const express = require('express');
const router = express.Router();
const protect = require('../middleware/authMiddleware');
const {
  checkoutOrders,
  getMyOrders,
  getReceivedOrders,
  updateOrderStatus,
} = require('../controllers/orders');

router.post('/checkout', protect, checkoutOrders);
router.get('/mine', protect, getMyOrders);
router.get('/my', protect, getMyOrders);
router.get('/received', protect, getReceivedOrders);
router.patch('/:id/status', protect, updateOrderStatus);

module.exports = router;
