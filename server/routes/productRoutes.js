const express = require('express');
const router = express.Router();
const protect = require('../middleware/authMiddleware');
const {
  createProduct,
  updateProduct,
  deleteProduct,
  getMyProducts,
  getProductById,
} = require('../controllers/productController');

router.post('/', protect, createProduct);
router.put('/:id', protect, updateProduct);
router.delete('/:id', protect, deleteProduct);
router.get('/my', protect, getMyProducts);
router.get('/:id', protect, getProductById);

module.exports = router;
