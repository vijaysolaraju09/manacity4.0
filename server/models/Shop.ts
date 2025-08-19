import { Schema, Document, model, Model } from 'mongoose';
import { Address, AddressSchema } from './shared/Address';
import { generateSlug } from '../utils/slug';

export interface DayHours {
  open: string;
  close: string;
}

export interface ShopAttrs {
  ownerId: Schema.Types.ObjectId;
  name: string;
  slug?: string;
  category: string;
  description?: string;
  logoUrl?: string;
  coverUrl?: string;
  phone?: string;
  whatsapp?: string;
  address?: Address;
  geo?: {
    type: 'Point';
    coordinates: [number, number];
  };
  hours?: Map<string, DayHours>;
  ratingAvg?: number;
  ratingCount?: number;
  tags?: string[];
  isDeleted?: boolean;
}

export interface ShopDoc extends Document, ShopAttrs {
  createdAt: Date;
  updatedAt: Date;
  isOpenNow: boolean;
}

const dayHoursSchema = new Schema<DayHours>(
  {
    open: { type: String, required: true },
    close: { type: String, required: true },
  },
  { _id: false }
);

const geoSchema = new Schema(
  {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], required: true },
  },
  { _id: false }
);

const shopSchema = new Schema<ShopDoc>(
  {
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true },
    slug: { type: String, unique: true },
    category: { type: String, required: true },
    description: { type: String, default: '' },
    logoUrl: { type: String },
    coverUrl: { type: String },
    phone: { type: String },
    whatsapp: { type: String },
    address: { type: AddressSchema },
    geo: { type: geoSchema },
    hours: { type: Map, of: dayHoursSchema },
    ratingAvg: { type: Number, default: 0 },
    ratingCount: { type: Number, default: 0 },
    tags: { type: [String], default: [] },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

shopSchema.index({ ownerId: 1 });
shopSchema.index({ slug: 1 }, { unique: true });
shopSchema.index({ category: 1 });
shopSchema.index({ ratingAvg: -1 });
shopSchema.index({ geo: '2dsphere' });

shopSchema.pre('validate', async function (next) {
  if (!this.slug && this.name) {
    this.slug = await generateSlug(this.constructor as Model<ShopDoc>, this.name);
  }
  next();
});

shopSchema.virtual('isOpenNow').get(function (this: ShopDoc) {
  if (!this.hours) return false;
  const now = new Date();
  const day = now.toLocaleString('en-US', { weekday: 'short' }).toLowerCase();
  const hours = this.hours.get(day);
  if (!hours) return false;
  const [openH, openM] = hours.open.split(':').map(Number);
  const [closeH, closeM] = hours.close.split(':').map(Number);
  const open = new Date(now);
  open.setHours(openH, openM, 0, 0);
  const close = new Date(now);
  close.setHours(closeH, closeM, 0, 0);
  return now >= open && now <= close;
});

export const ShopModel = model<ShopDoc>('Shop', shopSchema);

export default ShopModel;

