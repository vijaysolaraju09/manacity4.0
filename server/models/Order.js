const { Schema, model } = require('mongoose');

const orderItemSchema = new Schema(
  {
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    variantId: { type: Schema.Types.ObjectId, ref: 'ProductVariant' },
    title: { type: String, required: true },
    image: { type: String, required: true },
    unitPrice: { type: Number, required: true },
    qty: { type: Number, required: true },
    total: { type: Number, required: true },
  },
  { _id: false }
);

const pricingSchema = new Schema(
  {
    subtotal: { type: Number, required: true },
    discountTotal: { type: Number, default: 0 },
    grandTotal: { type: Number, required: true },
  },
  { _id: false }
);

const contactAtAcceptanceSchema = new Schema(
  {
    buyerPhone: { type: String, required: true },
    buyerName: { type: String, required: true },
  },
  { _id: false }
);

const paymentSchema = new Schema(
  {
    status: { type: String, default: 'pending' },
    method: { type: String },
    txnId: { type: String },
  },
  { _id: false }
);

const timelineSchema = new Schema(
  {
    placedAt: { type: Date, default: Date.now },
    acceptedAt: { type: Date },
    cancelledAt: { type: Date },
    completedAt: { type: Date },
  },
  { _id: false }
);

const orderSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    shopId: { type: Schema.Types.ObjectId, ref: 'Shop', required: true },
    items: { type: [orderItemSchema], required: true },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'cancelled', 'completed'],
      default: 'pending',
    },
    pricing: { type: pricingSchema, required: true },
    contactAtAcceptance: { type: contactAtAcceptanceSchema },
    payment: { type: paymentSchema, default: { status: 'pending' } },
    timeline: { type: timelineSchema, required: true },
    notes: { type: String },
  },
  { timestamps: true }
);

orderSchema.index({ userId: 1, status: 1, createdAt: -1 });
orderSchema.index({ shopId: 1, status: 1, createdAt: -1 });

module.exports = model('Order', orderSchema);

