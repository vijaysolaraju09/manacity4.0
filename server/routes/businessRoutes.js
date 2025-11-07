const express = require('express');
const protect = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const {
  listShopProducts,
  createShopProduct,
  updateBusinessProduct,
  deleteBusinessProduct,
} = require('../controllers/businessProductController');
const { updateOrderStatus } = require('../controllers/orderController');

const router = express.Router();

router.use(protect, roleMiddleware(['business', 'admin']));

router.get('/shops/:shopId/products', listShopProducts);
router.post('/shops/:shopId/products', createShopProduct);
router.patch('/products/:id', updateBusinessProduct);
router.delete('/products/:id', deleteBusinessProduct);
router.patch('/orders/:id', updateOrderStatus);

module.exports = router;
