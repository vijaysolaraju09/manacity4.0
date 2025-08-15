const express = require('express');
const {
  getAllUsers,
  deleteUser,
  verifyUser,
  getAllOrders,
} = require('../controllers/adminController');
const protect = require('../middleware/authMiddleware');
const isAdmin = require('../middleware/isAdmin');

const router = express.Router();

router.get('/users', protect, isAdmin, getAllUsers);
router.delete('/user/:id', protect, isAdmin, deleteUser);
router.put('/user/:id/verify', protect, isAdmin, verifyUser);
router.get('/orders', protect, isAdmin, getAllOrders);

module.exports = router;
