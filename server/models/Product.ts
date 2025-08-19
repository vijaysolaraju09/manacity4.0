import { Schema, Document, model, Model } from 'mongoose';

export interface MediaAsset {
  url: string;
  alt?: string;
  isPrimary?: boolean;
}

const MediaAssetSchema = new Schema<MediaAsset>(
  {
    url: { type: String, required: true },
    alt: { type: String },
    isPrimary: { type: Boolean, default: false },
  },
  { _id: false }
);

export interface Pricing {
  mrp: number;
  price: number;
  discountPercent?: number;
  currency: string;
}

const PricingSchema = new Schema<Pricing>(
  {
    mrp: { type: Number, required: true },
    price: { type: Number, required: true },
    discountPercent: { type: Number, default: 0 },
    currency: { type: String, default: 'USD' },
  },
  { _id: false }
);

export interface ProductAttrs {
  shopId: Schema.Types.ObjectId;
  title: string;
  slug?: string;
  description?: string;
  images?: MediaAsset[];
  category: string;
  tags?: string[];
  ratingAvg?: number;
  ratingCount?: number;
  pricing: Pricing;
  status?: 'active' | 'archived';
  isDeleted?: boolean;
}

export interface ProductDoc extends Document, ProductAttrs {
  createdAt: Date;
  updatedAt: Date;
}

interface ProductModel extends Model<ProductDoc> {
  exists(filter: any): Promise<any>;
}

function slugify(text: string): string {
  return text
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const productSchema = new Schema<ProductDoc>(
  {
    shopId: { type: Schema.Types.ObjectId, ref: 'Shop', required: true },
    title: { type: String, required: true },
    slug: { type: String, unique: true },
    description: { type: String, default: '' },
    images: { type: [MediaAssetSchema], default: [] },
    category: { type: String, required: true },
    tags: { type: [String], default: [] },
    ratingAvg: { type: Number, default: 0 },
    ratingCount: { type: Number, default: 0 },
    pricing: { type: PricingSchema, required: true },
    status: { type: String, enum: ['active', 'archived'], default: 'active' },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

productSchema.pre('validate', async function (next) {
  if (!this.slug && this.title) {
    const base = slugify(this.title);
    let slug = base;
    let i = 0;
    while (await (this.constructor as ProductModel).exists({ slug })) {
      i += 1;
      slug = `${base}-${i}`;
    }
    this.slug = slug;
  }
  if (this.pricing) {
    const { mrp, price } = this.pricing;
    if (mrp > 0) {
      this.pricing.discountPercent = Math.round(((mrp - price) / mrp) * 100);
    } else {
      this.pricing.discountPercent = 0;
    }
  }
  next();
});

productSchema.index({ shopId: 1 });
productSchema.index({ slug: 1 }, { unique: true });
productSchema.index({ category: 1 });
productSchema.index({ status: 1 });
productSchema.index({ shopId: 1, status: 1 });

export const ProductModel = model<ProductDoc>('Product', productSchema);

export default ProductModel;

