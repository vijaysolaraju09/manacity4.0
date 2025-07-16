const express = require("express");
const router = express.Router();
const protect = require("../middleware/authMiddleware");
const {
  createShop,
  getAllShops,
  getShopById,
  getProductsByShop,
} = require("../controllers/shopController");

router.post("/", protect, createShop);
router.get("/", getAllShops);
router.get("/:id", getShopById);
router.get("/:id/products", getProductsByShop);

module.exports = router;
