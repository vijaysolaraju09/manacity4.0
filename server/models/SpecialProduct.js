const mongoose = require("mongoose");

const specialProductSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: { type: String },
    image: { type: String },
    price: { type: String, default: "Free" },
    category: { type: String, required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("SpecialProduct", specialProductSchema);
