const express = require("express");
const router = express.Router();
const {
  getSpecialProducts,
  addSpecialProduct,
} = require("../controllers/specialProductController");
const protect = require("../middleware/authMiddleware");
const isAdmin = require("../middleware/isAdmin");
const validate = require("../middleware/validate");
const { addSpecialProductSchema } = require("../validators/specialProductSchemas");

// Public: fetch special products
router.get("/", getSpecialProducts);

// Admin: create product (can later add admin middleware)
router.post(
  "/",
  protect,
  isAdmin,
  validate(addSpecialProductSchema),
  addSpecialProduct
);

module.exports = router;
