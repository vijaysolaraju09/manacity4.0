const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    shop: { type: mongoose.Schema.Types.ObjectId, ref: "Shop", required: true },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
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
    city: { type: String, index: true },
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date },
    schemaVersion: { type: Number, default: 1 },
  },
  { timestamps: true }
);

productSchema.index({ shop: 1, status: 1, category: 1, isDeleted: 1 });

module.exports = mongoose.model("Product", productSchema);
