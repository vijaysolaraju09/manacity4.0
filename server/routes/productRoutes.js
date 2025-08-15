const express = require('express');
const router = express.Router();
const protect = require('../middleware/authMiddleware');
const isAdmin = require('../middleware/isAdmin');
const {
  createProduct,
  updateProduct,
  deleteProduct,
  getProducts,
  getMyProducts,
  getProductById,
} = require('../controllers/productController');

router.get('/', protect, isAdmin, getProducts);
router.post('/', protect, createProduct);
router.put('/:id', protect, updateProduct);
router.delete('/:id', protect, deleteProduct);
router.get('/my', protect, getMyProducts);
router.get('/:id', protect, getProductById);

module.exports = router;
