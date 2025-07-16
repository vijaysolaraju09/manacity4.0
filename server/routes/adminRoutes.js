const express = require('express');
const {
  getAllUsers,
  deleteUser,
  verifyUser,
  getAllOrders,
} = require('../controllers/adminController');
const protectAdmin = require('../middleware/adminAuth');

const router = express.Router();

router.get('/users', protectAdmin, getAllUsers);
router.delete('/user/:id', protectAdmin, deleteUser);
router.put('/user/:id/verify', protectAdmin, verifyUser);
router.get('/orders', protectAdmin, getAllOrders);

module.exports = router;
