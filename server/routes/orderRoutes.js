const express = require("express");
const router = express.Router();
const protect = require("../middleware/authMiddleware");
const {
  placeOrder,
  getMyOrders,
  getReceivedOrders,
  getOrderById,
  acceptOrder,
  rejectOrder,
  cancelOrder,
} = require("../controllers/orderController");

router.post("/place/:productId", protect, placeOrder);
router.get("/my", protect, getMyOrders);
router.get("/received", protect, getReceivedOrders);
router.get("/:id", protect, getOrderById);
router.post("/accept/:id", protect, acceptOrder);
router.post("/reject/:id", protect, rejectOrder);
router.post("/cancel/:id", protect, cancelOrder);

module.exports = router;
