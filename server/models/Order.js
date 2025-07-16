const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema(
  {
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    shop: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, // business
    items: [
      {
        name: String,
        productId: { type: mongoose.Schema.Types.ObjectId },
        quantity: Number,
        price: String,
      },
    ],
    status: {
      type: String,
      enum: ["pending", "accepted", "rejected"],
      default: "pending",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Order", orderSchema);
