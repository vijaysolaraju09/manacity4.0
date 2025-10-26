const mongoose = require('mongoose');

const ShopSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 120 },
    category: { type: String, required: true, trim: true },
    location: { type: String, required: true, trim: true },
    address: { type: String, default: '', trim: true },
    image: { type: String, trim: true },
    banner: { type: String, trim: true },
    description: { type: String, default: '', maxlength: 1000, trim: true },
    isOpen: { type: Boolean, default: true },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    verified: { type: Boolean, default: false },
    ratingAvg: { type: Number, default: 0 },
    ratingCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

ShopSchema.index({ owner: 1, name: 1 }, { unique: true });
ShopSchema.index({ status: 1, category: 1, location: 1, createdAt: -1 });

ShopSchema.methods.toCardJSON = function () {
  return {
    id: this._id,
    _id: this._id,
    owner: this.owner,
    name: this.name,
    category: this.category,
    location: this.location,
    address: this.address || '',
    image: this.image || null,
    banner: this.banner || null,
    description: this.description || '',
    status: this.status,
    isOpen: Boolean(this.isOpen),
    ratingAvg: this.ratingAvg || 0,
    ratingCount: this.ratingCount || 0,
    createdAt: this.createdAt,
  };
};

module.exports = mongoose.model('Shop', ShopSchema);
