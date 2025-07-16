const express = require("express");
const router = express.Router();
const protect = require("../middleware/authMiddleware");
const {
  addToCart,
  getMyCart,
  removeFromCart,
} = require("../controllers/cartController");

router.post("/", protect, addToCart);
router.get("/", protect, getMyCart);
router.delete("/:id", protect, removeFromCart);

module.exports = router;
