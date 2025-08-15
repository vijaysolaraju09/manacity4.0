const mongoose = require("mongoose");

const eventSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    startAt: { type: Date, required: true },
    endAt: { type: Date, required: true },
    capacity: { type: Number, required: true },
    registeredUsers: [
      { type: mongoose.Schema.Types.ObjectId, ref: "User" }
    ]
  },
  { timestamps: true }
);

function getStatus(e) {
  const now = new Date();
  if (now < e.startAt) return "upcoming";
  if (now > e.endAt) return "past";
  return "ongoing";
}

eventSchema.virtual("status").get(function () {
  return getStatus(this);
});

eventSchema.virtual("registered").get(function () {
  return this.registeredUsers.length;
});

// include virtuals when converting to JSON
// eslint-disable-next-line func-names
if (!eventSchema.options.toJSON) eventSchema.options.toJSON = {};
// eslint-disable-next-line func-names
if (!eventSchema.options.toObject) eventSchema.options.toObject = {};
eventSchema.options.toJSON.virtuals = true;
eventSchema.options.toObject.virtuals = true;

module.exports = mongoose.model("Event", eventSchema);
