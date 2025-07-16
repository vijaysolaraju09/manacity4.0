const express = require("express");
const router = express.Router();
const {
  getSpecialProducts,
  addSpecialProduct,
} = require("../controllers/specialProductController");

// Public: fetch special products
router.get("/", getSpecialProducts);

// Admin: create product (can later add admin middleware)
router.post("/", addSpecialProduct);

module.exports = router;
