const express = require('express');
const router = express.Router();
const protect = require('../middleware/authMiddleware');
const {
  createOrder,
  checkoutOrders,
  getMyOrders,
  getReceivedOrders,
  getOrderById,
  updateOrderStatus,
  cancelOrder,
  rateOrder,
} = require('../controllers/orderController');

router.post('/', protect, createOrder);
router.post('/checkout', protect, checkoutOrders);
router.get('/mine', protect, getMyOrders);
router.get('/received', protect, getReceivedOrders);
router.get('/:id', protect, getOrderById);
router.patch('/:id/status', protect, updateOrderStatus);
router.patch('/:id/cancel', protect, cancelOrder);
router.post('/:id/rate', protect, rateOrder);

module.exports = router;

