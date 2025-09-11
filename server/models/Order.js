const { Schema, model } = require('mongoose');

// Individual item in an order
const orderItemSchema = new Schema(
  {
    productId: { type: Schema.Types.ObjectId, ref: 'Product' },
    name: { type: String, required: true },
    image: { type: String },
    price: { type: Number, required: true },
    quantity: { type: Number, required: true },
    total: { type: Number, required: true },
  },
  { _id: false }
);

// Totals block for an order
const totalsSchema = new Schema(
  {
    subtotal: { type: Number, required: true },
    discount: { type: Number, default: 0 },
    total: { type: Number, required: true },
  },
  { _id: false }
);

const orderSchema = new Schema(
  {
    type: { type: String, enum: ['product', 'service'], default: 'product' },
    customerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    targetId: { type: Schema.Types.ObjectId, required: true },
    items: { type: [orderItemSchema], required: true },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'cancelled', 'completed'],
      default: 'pending',
    },
    totals: { type: totalsSchema, required: true },
    contactSharedAt: { type: Date },
  },
  { timestamps: true }
);

orderSchema.index({ customerId: 1, status: 1, createdAt: -1 });
orderSchema.index({ targetId: 1, status: 1, createdAt: -1 });

module.exports = model('Order', orderSchema);

