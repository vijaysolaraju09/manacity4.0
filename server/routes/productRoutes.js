const express = require('express');
const router = express.Router();
const protect = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const {
  createProduct,
  updateProduct,
  deleteProduct,
  getProducts,
  getMyProducts,
  getProductById,
} = require('../controllers/productController');

router.get('/', getProducts);
router.post('/', protect, roleMiddleware(['business', 'admin']), createProduct);
router.patch('/:id', protect, roleMiddleware(['business', 'admin']), updateProduct);
router.delete('/:id', protect, roleMiddleware(['business', 'admin']), deleteProduct);
router.get('/my', protect, roleMiddleware(['business', 'admin']), getMyProducts);
router.get('/:id', getProductById);

module.exports = router;
