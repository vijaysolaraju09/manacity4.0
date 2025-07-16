const mongoose = require("mongoose");

const eventSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    type: { type: String, required: true }, // tournament, exhibition, etc.
    mode: { type: String, enum: ["online", "offline"], required: true },
    coverImage: { type: String },
    date: { type: String, required: true }, // format: YYYY-MM-DD
    time: { type: String, required: true }, // format: HH:mm
    location: { type: String, default: "" },
    description: { type: String, default: "" },
    totalSlots: { type: Number, required: true },
    entryFee: { type: String, default: "Free" },
    registrationDeadline: { type: Date, required: true },
    messageFromAdmin: {
      type: {
        text: String,
        image: String,
        link: String,
      },
      default: {},
    },
    status: {
      type: String,
      enum: ["upcoming", "ongoing", "closed"],
      default: "upcoming",
    },
    registeredUsers: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        status: {
          type: String,
          enum: ["pending", "accepted", "rejected"],
          default: "pending",
        },
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Event", eventSchema);
