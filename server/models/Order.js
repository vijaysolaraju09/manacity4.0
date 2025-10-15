const { Schema, model } = require('mongoose');

// ---------------------------------------------------------------------------
// Order Item Schema
// ---------------------------------------------------------------------------
const orderItemSchema = new Schema(
  {
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    productSnapshot: {
      name: { type: String, required: true },
      image: { type: String },
      sku: { type: String },
      category: { type: String },
    },
    unitPrice: { type: Number, required: true, min: 0 },
    qty: { type: Number, required: true, min: 1 },
    subtotal: { type: Number, required: true, min: 0 },
    options: { type: Schema.Types.Mixed },
  },
  { _id: false, timestamps: false }
);

// ---------------------------------------------------------------------------
// Timeline entry
// ---------------------------------------------------------------------------
const timelineSchema = new Schema(
  {
    at: { type: Date, default: Date.now },
    by: {
      type: String,
      enum: ['system', 'user', 'shop', 'admin'],
      required: true,
    },
    status: {
      type: String,
      enum: [
        'draft',
        'pending',
        'placed',
        'accepted',
        'rejected',
        'confirmed',
        'preparing',
        'ready',
        'out_for_delivery',
        'delivered',
        'completed',
        'cancelled',
        'returned',
      ],
      required: true,
    },
    note: { type: String },
  },
  { _id: false }
);

// ---------------------------------------------------------------------------
// Order Schema
// ---------------------------------------------------------------------------
const orderSchema = new Schema(
  {
    shop: { type: Schema.Types.ObjectId, ref: 'Shop', required: true, index: true },
    shopSnapshot: {
      name: { type: String, required: true },
      location: { type: String },
      address: { type: String },
    },
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    userSnapshot: {
      name: { type: String, required: true },
      phone: { type: String, required: true },
      location: { type: String },
      address: { type: String },
    },
    items: { type: [orderItemSchema], default: [], validate: [arrayMinValidator, 'Order must have at least one item'] },
    notes: { type: String, maxlength: 1000 },
    status: {
      type: String,
      enum: [
        'draft',
        'pending',
        'placed',
        'accepted',
        'rejected',
        'confirmed',
        'preparing',
        'ready',
        'out_for_delivery',
        'delivered',
        'cancelled',
        'completed',
        'returned',
      ],
      default: 'pending',
      required: true,
      index: true,
    },
    fulfillment: {
      type: new Schema(
        {
          type: { type: String, enum: ['pickup', 'delivery'], required: true },
          eta: { type: Date },
        },
        { _id: false }
      ),
      required: true,
    },
    shippingAddress: {
      name: { type: String },
      label: { type: String },
      phone: { type: String },
      address1: { type: String },
      address2: { type: String },
      landmark: { type: String },
      city: { type: String },
      state: { type: String },
      pincode: { type: String },
      referenceId: { type: String },
      geo: {
        lat: { type: Number },
        lng: { type: Number },
      },
    },
    currency: { type: String, default: 'INR' },
    itemsTotal: { type: Number, required: true, min: 0, default: 0 },
    discountTotal: { type: Number, required: true, min: 0, default: 0 },
    taxTotal: { type: Number, required: true, min: 0, default: 0 },
    shippingFee: { type: Number, required: true, min: 0, default: 0 },
    grandTotal: { type: Number, required: true, min: 0, default: 0 },
    payment: {
      method: {
        type: String,
        enum: ['cod', 'upi', 'card', 'netbanking'],
        default: 'cod',
      },
      provider: { type: String },
      status: {
        type: String,
        enum: ['pending', 'authorized', 'paid', 'refunded', 'failed'],
        default: 'pending',
      },
      providerOrderId: { type: String, index: true },
      providerPaymentId: { type: String, index: true },
      providerRefundId: { type: String },
      paidAt: { type: Date },
      receiptId: { type: String },
      idempotencyKey: { type: String, index: true, sparse: true, unique: true },
    },
    timeline: { type: [timelineSchema], default: [] },
    cancel: {
      by: { type: String, enum: ['user', 'shop', 'admin'] },
      reason: { type: String },
      at: { type: Date },
    },
    return: {
      reason: { type: String },
      at: { type: Date },
    },
    rating: { type: Number, min: 1, max: 5 },
    review: { type: String, maxlength: 1000 },
  },
  { timestamps: true }
);

// ---------------------------------------------------------------------------
// Custom validators
// ---------------------------------------------------------------------------
function arrayMinValidator(val) {
  return Array.isArray(val) && val.length > 0;
}

// ---------------------------------------------------------------------------
// Validation hooks
// ---------------------------------------------------------------------------
orderSchema.pre('validate', function (next) {
  if (this.fulfillment?.type === 'delivery') {
    if (!this.shippingAddress || !this.shippingAddress.address1) {
      this.invalidate('shippingAddress', 'Shipping address required for delivery');
    }
  }

  const computedTotal =
    (this.itemsTotal || 0) - (this.discountTotal || 0) + (this.taxTotal || 0) + (this.shippingFee || 0);
  if (this.grandTotal !== computedTotal) {
    this.invalidate('grandTotal', 'grandTotal must equal itemsTotal - discountTotal + taxTotal + shippingFee');
  }

  next();
});

// ---------------------------------------------------------------------------
// Indexes
// ---------------------------------------------------------------------------
orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ shop: 1, status: 1, createdAt: -1 });
orderSchema.index({ status: 1, createdAt: -1 });
orderSchema.index({ 'payment.providerOrderId': 1 });

module.exports = model('Order', orderSchema);

