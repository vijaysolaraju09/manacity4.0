import { Schema, Document, model, Model } from 'mongoose';

export interface InventoryAttrs {
  productId: Schema.Types.ObjectId;
  variantId?: Schema.Types.ObjectId;
  stock: number;
  threshold?: number;
  isInStock?: boolean;
}

export interface InventoryDoc extends Document, InventoryAttrs {
  createdAt: Date;
  updatedAt: Date;
}

interface InventoryModel extends Model<InventoryDoc> {
  adjustStock(
    productId: Schema.Types.ObjectId,
    variantId: Schema.Types.ObjectId | null,
    delta: number
  ): Promise<InventoryDoc | null>;
}

const inventorySchema = new Schema<InventoryDoc>(
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

inventorySchema.statics.adjustStock = async function (
  productId: Schema.Types.ObjectId,
  variantId: Schema.Types.ObjectId | null,
  delta: number
) {
  const query: any = { productId };
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

export const InventoryModel = model<InventoryDoc, InventoryModel>(
  'Inventory',
  inventorySchema
);

export default InventoryModel;

