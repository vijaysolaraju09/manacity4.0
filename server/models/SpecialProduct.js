const { Schema, model } = require('mongoose');

const specialProductSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    price: { type: Number, required: true },
    mrp: { type: Number, required: true },
    image: { type: String, trim: true },
    stock: { type: Number, default: 0 },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = model('SpecialProduct', specialProductSchema);
