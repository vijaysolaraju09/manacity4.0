const express = require("express");
const router = express.Router();
const protect = require("../middleware/authMiddleware");
const isAdmin = require("../middleware/isAdmin");
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
  updateShop,
  deleteShop,
} = require("../controllers/shopController");

router.post("/", protect, createShop);
router.get("/requests", protect, isAdmin, getPendingShops);
router.post("/approve/:id", protect, isAdmin, approveShop);
router.post("/reject/:id", protect, isAdmin, rejectShop);
router.get("/my", protect, getMyShop);
router.get("/", getAllShops);
router.put("/:id", protect, isAdmin, updateShop);
router.delete("/:id", protect, isAdmin, deleteShop);
router.get("/my-products", protect, getMyProducts);
router.get("/:id/products", getProductsByShop);
router.get("/:id", getShopById);

module.exports = router;
