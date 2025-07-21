const express = require("express");
const router = express.Router();
const protect = require("../middleware/authMiddleware");
const adminAuth = require("../middleware/adminAuth");
const {
  createShop,
  getAllShops,
  getShopById,
  getProductsByShop,
  getPendingShops,
  approveShop,
} = require("../controllers/shopController");

router.post("/", protect, createShop);
router.get("/pending", adminAuth, getPendingShops);
router.put("/approve/:id", adminAuth, approveShop);
router.get("/", getAllShops);
router.get("/:id", getShopById);
router.get("/:id/products", getProductsByShop);

module.exports = router;
