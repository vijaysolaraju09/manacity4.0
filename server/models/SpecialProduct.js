const { Schema, model } = require('mongoose');

const specialProductSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    price: { type: Number, required: true },
    mrp: { type: Number, required: true },
    image: { type: String, trim: true },
    stock: { type: Number, default: 0 },
    active: { type: Boolean, default: true },
    linkedProduct: { type: Schema.Types.ObjectId, ref: 'Product' },
    ctaLabel: { type: String, trim: true },
    ctaType: { type: String, trim: true, lowercase: true },
    ctaUrl: { type: String, trim: true },
    ctaPhone: { type: String, trim: true },
  },
  { timestamps: true }
);

module.exports = model('SpecialProduct', specialProductSchema);
