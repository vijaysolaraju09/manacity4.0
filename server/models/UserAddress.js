const { Schema, model } = require('mongoose');

const normalizeSegment = (value) =>
  typeof value === 'string' ? value.trim().replace(/\s+/g, ' ').toLowerCase() : '';

const userAddressSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    label: { type: String, required: true, trim: true },
    line1: { type: String, required: true, trim: true },
    line2: { type: String, trim: true },
    city: { type: String, required: true, trim: true },
    state: { type: String, required: true, trim: true },
    pincode: { type: String, required: true, trim: true },
    coords: {
      lat: { type: Number },
      lng: { type: Number },
    },
    isDefault: { type: Boolean, default: false },
    lastUsedAt: { type: Date, default: Date.now },
    fingerprint: { type: String, required: true },
  },
  { timestamps: true }
);

userAddressSchema.pre('validate', function (next) {
  const parts = [this.line1, this.line2 || '', this.city, this.state, this.pincode];
  this.fingerprint = parts.map((segment) => normalizeSegment(segment)).join('|');
  if (!this.label) {
    this.invalidate('label', 'Label is required');
  }
  next();
});

userAddressSchema.index({ user: 1, fingerprint: 1 }, { unique: true });
userAddressSchema.index({ user: 1, isDefault: -1, lastUsedAt: -1 });

module.exports = model('UserAddress', userAddressSchema);
