const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    message: { type: String, required: true },
    image: { type: String },
    link: { type: String },
    type: {
      type: String,
      enum: ["order", "admin", "offer", "system"],
      default: "system",
    },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null }, // null = global
    viewedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Notification", notificationSchema);
