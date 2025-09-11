const { Schema, model } = require('mongoose');

const productSchema = new Schema(
  {
    shop: { type: Schema.Types.ObjectId, ref: 'Shop', required: true },
    name: { type: String, required: true },
    description: { type: String, default: '' },
    price: { type: Number, required: true },
    mrp: { type: Number, required: true },
    discount: { type: Number, default: 0 },
    image: { type: String },
    category: { type: String, required: true },
    stock: { type: Number, default: 0 },
    available: { type: Boolean, default: true },
    isSpecial: { type: Boolean, default: false },
    status: { type: String, enum: ['active', 'archived'], default: 'active' },
    city: { type: String },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date },
  },
  { timestamps: true }
);

productSchema.pre('save', function (next) {
  if (this.mrp > 0) {
    this.discount = Math.round(((this.mrp - this.price) / this.mrp) * 100);
  } else {
    this.discount = 0;
  }
  next();
});

module.exports = model('Product', productSchema);
