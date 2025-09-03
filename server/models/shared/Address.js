const { Schema } = require('mongoose');

const AddressSchema = new Schema(
  {
    label: { type: String, required: true },
    line1: { type: String, required: true },
    line2: { type: String },
    city: { type: String, required: true },
    state: { type: String, required: true },
    pincode: { type: String, required: true },
    coords: {
      lat: { type: Number },
      lng: { type: Number },
    },
    isDefault: { type: Boolean, default: false },
  },
  { _id: false }
);

module.exports = { AddressSchema };
