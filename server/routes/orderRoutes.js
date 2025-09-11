const express = require('express');
const router = express.Router();
const protect = require('../middleware/authMiddleware');
const {
  createOrder,
  getMyOrders,
  getReceivedOrders,
  updateOrderStatus,
} = require('../controllers/orderController');

router.post('/', protect, createOrder);
router.get('/mine', protect, getMyOrders);
router.get('/received', protect, getReceivedOrders);
router.patch('/:id', protect, updateOrderStatus);

module.exports = router;

