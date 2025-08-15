const express = require('express');
const {
  getUsers,
  updateUserRole,
  updateUserStatus,
  deleteUser,
  verifyUser,
  getAllOrders,
} = require('../controllers/adminController');
const protect = require('../middleware/authMiddleware');
const isAdmin = require('../middleware/isAdmin');

const router = express.Router();

router.get('/users', protect, isAdmin, getUsers);
router.put('/users/:id/role', protect, isAdmin, updateUserRole);
router.put('/users/:id/status', protect, isAdmin, updateUserStatus);
router.delete('/users/:id', protect, isAdmin, deleteUser);
router.put('/user/:id/verify', protect, isAdmin, verifyUser);
router.get('/orders', protect, isAdmin, getAllOrders);

module.exports = router;
