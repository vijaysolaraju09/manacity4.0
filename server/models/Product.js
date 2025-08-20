const { Schema, model } = require('mongoose');

const mediaAssetSchema = new Schema(
  {
    url: { type: String, required: true },
    alt: { type: String },
    isPrimary: { type: Boolean, default: false },
  },
  { _id: false }
);

const pricingSchema = new Schema(
  {
    mrp: { type: Number, required: true },
    price: { type: Number, required: true },
    discountPercent: { type: Number, default: 0 },
    currency: { type: String, default: 'USD' },
  },
  { _id: false }
);

function slugify(text) {
  return text
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const productSchema = new Schema(
  {
    shopId: { type: Schema.Types.ObjectId, ref: 'Shop', required: true },
    title: { type: String, required: true },
    slug: { type: String, unique: true },
    description: { type: String, default: '' },
    images: { type: [mediaAssetSchema], default: [] },
    category: { type: String, required: true },
    tags: { type: [String], default: [] },
    ratingAvg: { type: Number, default: 0 },
    ratingCount: { type: Number, default: 0 },
    pricing: { type: pricingSchema, required: true },
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
    while (await this.constructor.exists({ slug })) {
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

// Fetch all products belonging to a shop quickly
productSchema.index({ shopId: 1 });
// Fast lookups using unique slugs
productSchema.index({ slug: 1 }, { unique: true });
// Allow efficient filtering by category
productSchema.index({ category: 1 });
// Support queries on product availability
productSchema.index({ status: 1 });
// Retrieve shop products filtered by status (e.g. active/archived)
productSchema.index({ shopId: 1, status: 1 });

const ProductModel = model('Product', productSchema);

module.exports = { ProductModel };

