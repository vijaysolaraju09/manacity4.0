const mongoose = require("mongoose");

const interestSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    businessId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    shopId: { type: mongoose.Schema.Types.ObjectId, ref: "Shop", required: true },
    quantity: { type: Number, default: 1 },
    status: {
      type: String,
      enum: ["pending", "accepted", "rejected", "cancelled"],
      default: "pending",
    },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Interest", interestSchema);
