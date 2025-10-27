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
const {
  getMetricsSummary,
  getMetricSeries,
} = require('../controllers/adminMetricsController');
const { getAdminAnalytics } = require('../controllers/adminAnalyticsController');
const {
  listShopRequests,
  listShops,
  updateShop,
  deleteShop,
  approveShop,
  rejectShop,
} = require('../controllers/adminShopController');
const {
  listProducts,
  updateProduct: adminUpdateProduct,
  deleteProduct: adminDeleteProduct,
} = require('../controllers/adminProductController');
const {
  listVerificationRequests,
  updateVerificationRequestStatus,
} = require('../controllers/verifiedController');
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

router.get('/metrics', protect, isAdmin, getMetricsSummary);
router.get('/metrics/timeseries', protect, isAdmin, getMetricSeries);
router.get('/analytics', protect, isAdmin, getAdminAnalytics);

router.get('/shops/requests', protect, isAdmin, listShopRequests);
router.get('/shops', protect, isAdmin, listShops);
router.put('/shops/:id', protect, isAdmin, updateShop);
router.delete('/shops/:id', protect, isAdmin, deleteShop);
router.post('/shops/approve/:id', protect, isAdmin, approveShop);
router.post('/shops/:id/approve', protect, isAdmin, approveShop);
router.post('/shops/reject/:id', protect, isAdmin, rejectShop);
router.post('/shops/:id/reject', protect, isAdmin, rejectShop);

router.get('/products', protect, isAdmin, listProducts);
router.put('/products/:id', protect, isAdmin, adminUpdateProduct);
router.delete('/products/:id', protect, isAdmin, adminDeleteProduct);

router.get('/verified/requests', protect, isAdmin, listVerificationRequests);
router.patch(
  '/verification-requests/:id',
  protect,
  isAdmin,
  updateVerificationRequestStatus
);

module.exports = router;
