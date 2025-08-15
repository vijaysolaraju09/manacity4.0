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
  getMyShop,
  approveShop,
  rejectShop,
  getMyProducts,
} = require("../controllers/shopController");

router.post("/", protect, createShop);
router.get("/requests", adminAuth, getPendingShops);
router.put("/approve/:id", adminAuth, approveShop);
router.put("/reject/:id", adminAuth, rejectShop);
router.get("/my", protect, getMyShop);
router.get("/", getAllShops);
router.get("/my-products", protect, getMyProducts);
router.get("/:id", getShopById);
router.get("/:id/products", getProductsByShop);

module.exports = router;
