const { Schema, model } = require('mongoose');

const inventorySchema = new Schema(
  {
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    variantId: { type: Schema.Types.ObjectId, ref: 'ProductVariant' },
    stock: { type: Number, default: 0 },
    threshold: { type: Number, default: 0 },
    isInStock: { type: Boolean, default: true },
  },
  { timestamps: true }
);

inventorySchema.pre('save', function (next) {
  this.isInStock = this.stock > this.threshold;
  next();
});

inventorySchema.statics.adjustStock = async function (productId, variantId, delta) {
  const query = { productId };
  if (variantId) query.variantId = variantId;
  const update = { $inc: { stock: delta } };
  const options = { new: true, upsert: true };
  const doc = await this.findOneAndUpdate(query, update, options);
  if (doc) {
    doc.isInStock = doc.stock > doc.threshold;
    await doc.save();
  }
  return doc;
};

inventorySchema.index({ productId: 1 });
inventorySchema.index({ productId: 1, variantId: 1 }, { unique: true });

const InventoryModel = model('Inventory', inventorySchema);

module.exports = { InventoryModel };

