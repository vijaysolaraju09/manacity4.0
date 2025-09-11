const express = require('express');
const router = express.Router();
const protect = require('../middleware/authMiddleware');
const {
  createProduct,
  updateProduct,
  deleteProduct,
  getProducts,
  getMyProducts,
  getProductById,
} = require('../controllers/productController');

router.get('/', getProducts);
router.post('/', protect, createProduct);
router.patch('/:id', protect, updateProduct);
router.delete('/:id', protect, deleteProduct);
router.get('/my', protect, getMyProducts);
router.get('/:id', getProductById);

module.exports = router;
