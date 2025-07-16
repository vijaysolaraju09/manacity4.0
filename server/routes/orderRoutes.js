const express = require("express");
const router = express.Router();
const protect = require("../middleware/authMiddleware");
const {
  getMyOrders,
  getReceivedOrders,
  acceptOrder,
} = require("../controllers/orderController");

router.get("/my", protect, getMyOrders);
router.get("/received", protect, getReceivedOrders);
router.post("/accept/:id", protect, acceptOrder);

module.exports = router;
