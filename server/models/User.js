const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    phone: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    location: { type: String, required: true },
    address: { type: String, default: "" },
    role: {
      type: String,
      enum: ["customer", "verified", "business", "admin"],
      default: "customer",
    },
    isVerified: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    verificationStatus: {
      type: String,
      enum: ["pending", "verified", "rejected"],
    },
    profession: { type: String, default: "" },
    bio: { type: String, default: "" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
