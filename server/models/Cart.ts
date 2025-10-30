import { Schema, Document, model, Model, Types } from 'mongoose';

export interface CartItem {
  productId: Schema.Types.ObjectId;
  product?: Schema.Types.ObjectId;
  variantId?: Schema.Types.ObjectId;
  qty: number;
  unitPrice: number;
  appliedDiscount?: number;
}

const CartItemSchema = new Schema<CartItem>(
  {
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    product: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
      default: function defaultProduct(this: CartItem) {
        return (this as any).productId;
      },
    },
    variantId: { type: Schema.Types.ObjectId, ref: 'ProductVariant' },
    qty: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
    appliedDiscount: { type: Number, default: 0, min: 0 },
  },
  { _id: false }
);

CartItemSchema.pre('validate', function syncProductFields(next) {
  const doc = this as unknown as { productId?: Types.ObjectId; product?: Types.ObjectId };
  if (!doc.product && doc.productId) {
    doc.product = doc.productId;
  }
  if (!doc.productId && doc.product) {
    doc.productId = doc.product;
  }
  next();
});

export interface CartAttrs {
  userId: Schema.Types.ObjectId;
  items: CartItem[];
  currency: string;
  subtotal: number;
  discountTotal: number;
  grandTotal: number;
}

export interface CartDoc extends Document, CartAttrs {
  createdAt: Date;
  updatedAt: Date;
  computeTotals(): void;
}

interface UpsertOptions {
  replaceQuantity?: boolean;
}

interface CartModel extends Model<CartDoc> {
  upsertItem(
    userId: Types.ObjectId,
    item: CartItem,
    options?: UpsertOptions,
  ): Promise<{ cart: CartDoc; created: boolean }>;
  removeItem(
    userId: Types.ObjectId,
    productId: Types.ObjectId,
    variantId?: Types.ObjectId
  ): Promise<{ cart: CartDoc; removed: boolean } | null>;
}

function computeTotals(cart: CartDoc) {
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

const cartSchema = new Schema<CartDoc>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    items: { type: [CartItemSchema], default: [] },
    currency: { type: String, default: 'INR' },
    subtotal: { type: Number, default: 0 },
    discountTotal: { type: Number, default: 0 },
    grandTotal: { type: Number, default: 0 },
  },
  { timestamps: true }
);

cartSchema.methods.computeTotals = function () {
  computeTotals(this as CartDoc);
};

cartSchema.pre('validate', function (next) {
  computeTotals(this as CartDoc);
  next();
});

cartSchema.statics.upsertItem = async function (userId, item, options = {}) {
  const Cart = this as CartModel;
  const cart = (await Cart.findOne({ userId })) || new Cart({ userId });
  const normalizedQty = Math.max(1, Math.floor(item.qty));
  const normalizedUnitPrice = Math.max(0, Math.round(item.unitPrice));
  const { replaceQuantity = false } = options as UpsertOptions;
  const idx = cart.items.findIndex(
    (i) =>
      i.productId.equals(item.productId) &&
      (!item.variantId
        ? !i.variantId
        : i.variantId && item.variantId && i.variantId.equals(item.variantId))
  );
  let created = false;
  if (idx >= 0) {
    cart.items[idx].qty = replaceQuantity
      ? normalizedQty
      : cart.items[idx].qty + normalizedQty;
    cart.items[idx].unitPrice = normalizedUnitPrice;
    if (!cart.items[idx].product && cart.items[idx].productId) {
      cart.items[idx].product = cart.items[idx].productId;
    }
    if (item.appliedDiscount !== undefined)
      cart.items[idx].appliedDiscount = item.appliedDiscount;
  } else {
    const normalizedProductId = item.productId ?? item.product;
    if (!normalizedProductId) {
      throw new Error('Cart item requires a product reference');
    }
    cart.items.push({
      ...item,
      productId: normalizedProductId as Types.ObjectId,
      product: (item.product ?? item.productId ?? normalizedProductId) as Types.ObjectId,
      qty: normalizedQty,
      unitPrice: normalizedUnitPrice,
    });
    created = true;
  }
  await cart.save();
  return { cart, created };
};

cartSchema.statics.removeItem = async function (userId, productId, variantId) {
  const Cart = this as CartModel;
  const cart = await Cart.findOne({ userId });
  if (!cart) return null;

  const index = cart.items.findIndex(
    (item) =>
      item.productId.equals(productId) &&
      (!variantId || (item.variantId && item.variantId.equals(variantId)))
  );

  if (index < 0) {
    return { cart, removed: false };
  }

  cart.items.splice(index, 1);
  await cart.save();

  return { cart, removed: true };
};

cartSchema.index({ userId: 1 });

export const CartModel = model<CartDoc, CartModel>('Cart', cartSchema);

export default CartModel;

