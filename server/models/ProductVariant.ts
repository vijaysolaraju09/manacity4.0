import { Schema, Document, model } from 'mongoose';

export interface ProductVariantAttrs {
  productId: Schema.Types.ObjectId;
  name: string;
  sku: string;
  priceOverride?: number;
  mrpOverride?: number;
}

export interface ProductVariantDoc extends Document, ProductVariantAttrs {
  createdAt: Date;
  updatedAt: Date;
}

const productVariantSchema = new Schema<ProductVariantDoc>(
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

export const ProductVariantModel = model<ProductVariantDoc>(
  'ProductVariant',
  productVariantSchema
);

export default ProductVariantModel;

