const express = require("express");
const { z } = require("zod");
const router = express.Router();
const protect = require("../middleware/authMiddleware");
const validate = require("../middleware/validate");
const {
  addToCart,
  getMyCart,
  removeFromCart,
} = require("../controllers/cartController");

const objectId = z
  .string()
  .trim()
  .regex(/^[a-fA-F0-9]{24}$/u, "Invalid identifier");

const addItemSchema = {
  body: z
    .object({
      productId: objectId,
      quantity: z.coerce.number().int().min(1).max(50).optional(),
      replaceQuantity: z.boolean().optional(),
      variantId: objectId.optional(),
    })
    .strict(),
};

const removeItemSchema = {
  params: z.object({ id: objectId }).strict(),
};

router.post("/", protect, validate(addItemSchema), addToCart);
router.get("/", protect, getMyCart);
router.delete("/:id", protect, validate(removeItemSchema), removeFromCart);

module.exports = router;
