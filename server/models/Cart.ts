import { Schema, Document, model, Model, Types } from 'mongoose';

export interface CartItem {
  productId: Schema.Types.ObjectId;
  variantId?: Schema.Types.ObjectId;
  qty: number;
  unitPrice: number;
  appliedDiscount?: number;
}

const CartItemSchema = new Schema<CartItem>(
  {
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    variantId: { type: Schema.Types.ObjectId, ref: 'ProductVariant' },
    qty: { type: Number, required: true },
    unitPrice: { type: Number, required: true },
    appliedDiscount: { type: Number, default: 0 },
  },
  { _id: false }
);

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

interface CartModel extends Model<CartDoc> {
  upsertItem(userId: Types.ObjectId, item: CartItem): Promise<CartDoc>;
  removeItem(
    userId: Types.ObjectId,
    productId: Types.ObjectId,
    variantId?: Types.ObjectId
  ): Promise<CartDoc | null>;
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
    currency: { type: String, default: 'USD' },
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

cartSchema.statics.upsertItem = async function (userId, item) {
  const Cart = this as CartModel;
  const cart = (await Cart.findOne({ userId })) || new Cart({ userId });
  const idx = cart.items.findIndex(
    (i) =>
      i.productId.equals(item.productId) &&
      (!item.variantId
        ? !i.variantId
        : i.variantId && item.variantId && i.variantId.equals(item.variantId))
  );
  if (idx >= 0) {
    cart.items[idx].qty += item.qty;
    cart.items[idx].unitPrice = item.unitPrice;
    if (item.appliedDiscount !== undefined)
      cart.items[idx].appliedDiscount = item.appliedDiscount;
  } else {
    cart.items.push(item);
  }
  await cart.save();
  return cart;
};

cartSchema.statics.removeItem = async function (userId, productId, variantId) {
  const Cart = this as CartModel;
  const cart = await Cart.findOne({ userId });
  if (!cart) return null;
  cart.items = cart.items.filter(
    (i) =>
      !(
        i.productId.equals(productId) &&
        (variantId
          ? i.variantId && i.variantId.equals(variantId)
          : !i.variantId)
      )
  );
  await cart.save();
  return cart;
};

cartSchema.index({ userId: 1 });

export const CartModel = model<CartDoc, CartModel>('Cart', cartSchema);

export default CartModel;

