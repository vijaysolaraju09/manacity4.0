const { Schema, model } = require('mongoose');

const addressSchema = new Schema(
  {
    label: { type: String, trim: true },
    line1: { type: String, required: true, trim: true },
    line2: { type: String, trim: true },
    city: { type: String, required: true, trim: true },
    state: { type: String, required: true, trim: true },
    country: { type: String, trim: true },
    postalCode: { type: String, required: true, trim: true },
    location: {
      lat: { type: Number },
      lng: { type: Number },
    },
  },
  { timestamps: true }
);

module.exports = model('Address', addressSchema);
