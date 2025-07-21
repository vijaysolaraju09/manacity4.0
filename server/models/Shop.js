const mongoose = require("mongoose");

const shopSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    category: { type: String, required: true }, // e.g., grocery, clothing
    status: {
      type: String,
      enum: ["pending", "approved"],
      default: "pending",
    },
    location: { type: String, required: true },
    address: { type: String, default: "" },
    image: { type: String, default: "" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Shop", shopSchema);
