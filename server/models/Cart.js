const { Schema, model } = require('mongoose');

const cartItemSchema = new Schema(
  {
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    product: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
      default() {
        return this.productId;
      },
    },
    variantId: { type: Schema.Types.ObjectId, ref: 'ProductVariant' },
    qty: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
    appliedDiscount: { type: Number, default: 0, min: 0 },
  },
  { _id: false }
);

cartItemSchema.pre('validate', function syncProductFields(next) {
  if (!this.product && this.productId) {
    this.product = this.productId;
  }
  if (!this.productId && this.product) {
    this.productId = this.product;
  }
  next();
});

function computeTotals(cart) {
  let subtotal = 0;
  let discountTotal = 0;
  for (const item of cart.items) {
    subtotal += item.unitPrice * item.qty;
    discountTotal += item.appliedDiscount || 0;
  }
  cart.subtotal = subtotal;
  cart.discountTotal = discountTotal;
  cart.grandTotal = subtotal - discountTotal;
}

const cartSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    items: { type: [cartItemSchema], default: [] },
    currency: { type: String, default: 'INR' },
    subtotal: { type: Number, default: 0 },
    discountTotal: { type: Number, default: 0 },
    grandTotal: { type: Number, default: 0 },
  },
  { timestamps: true }
);

cartSchema.pre('validate', function (next) {
  computeTotals(this);
  next();
});

cartSchema.statics.upsertItem = async function (userId, item) {
  const cart = (await this.findOne({ userId })) || new this({ userId });
  const normalizedQty = Math.max(1, Math.floor(item.qty));
  const normalizedUnitPrice = Math.max(0, Math.round(item.unitPrice));
  const idx = cart.items.findIndex(
    (i) =>
      i.productId.equals(item.productId) &&
      (!item.variantId
        ? !i.variantId
        : i.variantId && item.variantId && i.variantId.equals(item.variantId))
  );
  let created = false;
  if (idx >= 0) {
    cart.items[idx].qty += normalizedQty;
    cart.items[idx].unitPrice = normalizedUnitPrice;
    if (!cart.items[idx].product && cart.items[idx].productId) {
      cart.items[idx].product = cart.items[idx].productId;
    }
    if (item.appliedDiscount !== undefined)
      cart.items[idx].appliedDiscount = item.appliedDiscount;
  } else {
    const normalizedProductId = item.productId || item.product;
    if (!normalizedProductId) {
      throw new Error('Cart item requires a product reference');
    }
    cart.items.push({
      ...item,
      productId: normalizedProductId,
      product: item.product || item.productId || normalizedProductId,
      qty: normalizedQty,
      unitPrice: normalizedUnitPrice,
    });
    created = true;
  }
  await cart.save();
  return { cart, created };
};

cartSchema.statics.removeItem = async function (userId, productId, variantId) {
  const cart = await this.findOne({ userId });
  if (!cart) return null;

  const index = cart.items.findIndex((item) => {
    if (!item.productId || !item.productId.equals(productId)) {
      return false;
    }

    if (!variantId) {
      return true;
    }

    return Boolean(item.variantId) && item.variantId.equals(variantId);
  });

  if (index < 0) {
    return { cart, removed: false };
  }

  cart.items.splice(index, 1);
  await cart.save();

  return { cart, removed: true };
};

cartSchema.index({ userId: 1 });

const CartModel = model('Cart', cartSchema);

module.exports = { CartModel };

