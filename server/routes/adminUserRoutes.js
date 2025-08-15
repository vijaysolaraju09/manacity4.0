const express = require('express');
const {
  getUsers,
  updateUserRole,
  updateUserStatus,
  deleteUser,
} = require('../controllers/adminController');
const protect = require('../middleware/authMiddleware');
const isAdmin = require('../middleware/isAdmin');
const validate = require('../middleware/validate');
const {
  updateUserRoleSchema,
  updateUserStatusSchema,
} = require('../validators/adminSchemas');

const router = express.Router();

router.get('/', protect, isAdmin, getUsers);
router.put(
  '/:id/role',
  protect,
  isAdmin,
  validate(updateUserRoleSchema),
  updateUserRole
);
router.put(
  '/:id/status',
  protect,
  isAdmin,
  validate(updateUserStatusSchema),
  updateUserStatus
);
router.delete('/:id', protect, isAdmin, deleteUser);

module.exports = router;
