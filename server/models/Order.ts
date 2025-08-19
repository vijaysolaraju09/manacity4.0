import { Schema, Document, model } from 'mongoose';

export interface OrderItem {
  productId: Schema.Types.ObjectId;
  variantId?: Schema.Types.ObjectId;
  title: string;
  image: string;
  unitPrice: number;
  qty: number;
  total: number;
}

const OrderItemSchema = new Schema<OrderItem>(
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

export interface Pricing {
  subtotal: number;
  discountTotal: number;
  grandTotal: number;
}

const PricingSchema = new Schema<Pricing>(
  {
    subtotal: { type: Number, required: true },
    discountTotal: { type: Number, default: 0 },
    grandTotal: { type: Number, required: true },
  },
  { _id: false }
);

export interface ContactAtAcceptance {
  buyerPhone: string;
  buyerName: string;
}

const ContactAtAcceptanceSchema = new Schema<ContactAtAcceptance>(
  {
    buyerPhone: { type: String, required: true },
    buyerName: { type: String, required: true },
  },
  { _id: false }
);

export interface Payment {
  status: string;
  method?: string;
  txnId?: string;
}

const PaymentSchema = new Schema<Payment>(
  {
    status: { type: String, default: 'pending' },
    method: { type: String },
    txnId: { type: String },
  },
  { _id: false }
);

export interface Timeline {
  placedAt: Date;
  acceptedAt?: Date;
  cancelledAt?: Date;
  completedAt?: Date;
}

const TimelineSchema = new Schema<Timeline>(
  {
    placedAt: { type: Date, default: Date.now },
    acceptedAt: { type: Date },
    cancelledAt: { type: Date },
    completedAt: { type: Date },
  },
  { _id: false }
);

export interface OrderAttrs {
  userId: Schema.Types.ObjectId;
  shopId: Schema.Types.ObjectId;
  items: OrderItem[];
  status?: 'pending' | 'accepted' | 'cancelled' | 'completed';
  pricing: Pricing;
  contactAtAcceptance?: ContactAtAcceptance;
  payment?: Payment;
  timeline: Timeline;
  notes?: string;
}

export interface OrderDoc extends Document, OrderAttrs {
  createdAt: Date;
  updatedAt: Date;
}

const orderSchema = new Schema<OrderDoc>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    shopId: { type: Schema.Types.ObjectId, ref: 'Shop', required: true },
    items: { type: [OrderItemSchema], required: true },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'cancelled', 'completed'],
      default: 'pending',
    },
    pricing: { type: PricingSchema, required: true },
    contactAtAcceptance: { type: ContactAtAcceptanceSchema },
    payment: { type: PaymentSchema, default: { status: 'pending' } },
    timeline: { type: TimelineSchema, required: true },
    notes: { type: String },
  },
  { timestamps: true }
);

orderSchema.index({ userId: 1, status: 1, createdAt: -1 });
orderSchema.index({ shopId: 1, status: 1, createdAt: -1 });

export const OrderModel = model<OrderDoc>('Order', orderSchema);
export default OrderModel;

