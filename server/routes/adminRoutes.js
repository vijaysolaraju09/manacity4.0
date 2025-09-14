const express = require('express');
const {
  getUsers,
  updateUserRole,
  updateUserStatus,
  deleteUser,
  verifyUser,
  getAllOrders,
} = require('../controllers/adminController');
const { adminUpdate } = require('../controllers/userController');
const { getAdminMessages } = require('../controllers/adminMessageController');
const { approveShop, rejectShop } = require('../controllers/shopsController');
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
router.patch('/users/:id', protect, isAdmin, adminUpdate);
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

router.post('/shops/:id/approve', protect, isAdmin, approveShop);
router.post('/shops/:id/reject', protect, isAdmin, rejectShop);

module.exports = router;
