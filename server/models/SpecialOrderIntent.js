const { Schema, model, Types } = require('mongoose');

const specialOrderIntentSchema = new Schema(
  {
    product: { type: Schema.Types.ObjectId, ref: 'SpecialProduct' },
    user: { type: Schema.Types.ObjectId, ref: 'User' },
    note: { type: String, trim: true },
    snapshot: {
      title: { type: String, trim: true },
      price: { type: Number },
      mrp: { type: Number },
      image: { type: String, trim: true },
    },
    metadata: {
      type: Map,
      of: String,
      default: () => new Types.Map(),
    },
  },
  { timestamps: true }
);

module.exports = model('SpecialOrderIntent', specialOrderIntentSchema);
