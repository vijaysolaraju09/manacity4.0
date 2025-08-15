const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    shop: { type: mongoose.Schema.Types.ObjectId, ref: "Shop", required: true },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    name: { type: String, required: true },
    description: { type: String, default: "" },
    price: { type: Number, required: true },
    mrp: { type: Number, required: true },
    category: { type: String, default: "general" },
    images: { type: [String], default: [] },
    stock: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
  },
  { timestamps: true }
);

productSchema.index({ shop: 1 });
productSchema.index({ category: 1 });

module.exports = mongoose.model("Product", productSchema);
