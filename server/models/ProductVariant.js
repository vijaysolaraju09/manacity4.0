const { Schema, model } = require('mongoose');

const productVariantSchema = new Schema(
  {
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    name: { type: String, required: true },
    sku: { type: String, required: true, unique: true },
    priceOverride: { type: Number },
    mrpOverride: { type: Number },
  },
  { timestamps: true }
);

productVariantSchema.index({ productId: 1 });
productVariantSchema.index({ sku: 1 }, { unique: true });

const ProductVariantModel = model('ProductVariant', productVariantSchema);

module.exports = { ProductVariantModel };

