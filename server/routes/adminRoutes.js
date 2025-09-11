const express = require('express');
const {
  getUsers,
  updateUserRole,
  updateUserStatus,
  deleteUser,
  verifyUser,
  getAllOrders,
} = require('../controllers/adminController');
const { getAdminMessages } = require('../controllers/adminMessageController');
const protect = require('../middleware/authMiddleware');
const isAdmin = require('../middleware/isAdmin');
const validate = require('../middleware/validate');
const {
  updateUserRoleSchema,
  updateUserStatusSchema,
} = require('../validators/adminSchemas');

const router = express.Router();

router.get('/messages', getAdminMessages);
router.get('/users', protect, isAdmin, getUsers);
router.put(
  '/users/:id/role',
  protect,
  isAdmin,
  validate(updateUserRoleSchema),
  updateUserRole
);
router.put(
  '/users/:id/status',
  protect,
  isAdmin,
  validate(updateUserStatusSchema),
  updateUserStatus
);
router.delete('/users/:id', protect, isAdmin, deleteUser);
router.put('/user/:id/verify', protect, isAdmin, verifyUser);
router.get('/orders', protect, isAdmin, getAllOrders);

module.exports = router;
