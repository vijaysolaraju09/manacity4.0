const express = require('express');
const {
  getUsers,
  updateUserRole,
  updateUserStatus,
  deleteUser,
} = require('../controllers/adminController');
const protect = require('../middleware/authMiddleware');
const isAdmin = require('../middleware/isAdmin');

const router = express.Router();

router.get('/', protect, isAdmin, getUsers);
router.put('/:id/role', protect, isAdmin, updateUserRole);
router.put('/:id/status', protect, isAdmin, updateUserStatus);
router.delete('/:id', protect, isAdmin, deleteUser);

module.exports = router;
