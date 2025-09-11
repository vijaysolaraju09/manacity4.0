const express = require("express");
const router = express.Router();
const protect = require("../middleware/authMiddleware");
const {
  createShop,
  getAllShops,
  getShopById,
  getProductsByShop,
  updateShop,
  deleteShop,
} = require("../controllers/shopController");
const { createProduct } = require("../controllers/productController");

router.post("/", protect, createShop);
router.get("/", getAllShops);
router.get("/:id", getShopById);
router.patch("/:id", protect, updateShop);
router.delete("/:id", protect, deleteShop);
router.get("/:id/products", getProductsByShop);
router.post("/:id/products", protect, (req, res, next) => {
  req.body.shopId = req.params.id;
  return createProduct(req, res, next);
});

module.exports = router;
