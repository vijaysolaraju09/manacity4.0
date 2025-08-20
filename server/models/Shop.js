const { Schema, model } = require('mongoose');
const { AddressSchema } = require('./shared/Address');

const dayHoursSchema = new Schema(
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

function slugify(text) {
  return text
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const shopSchema = new Schema(
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

shopSchema.index({ ownerId: 1 }); // quick lookup of shops by owner
shopSchema.index({ slug: 1 }, { unique: true }); // ensure unique slugs for URLs
shopSchema.index({ category: 1 }); // filter shops by category
shopSchema.index({ ratingAvg: -1 }); // sort shops by average rating
shopSchema.index({ geo: '2dsphere' }); // enable geospatial queries

shopSchema.pre('validate', async function (next) {
  if (!this.slug && this.name) {
    const base = slugify(this.name);
    let slug = base;
    let i = 0;
    const Shop = this.constructor;
    while (await Shop.exists({ slug })) {
      i += 1;
      slug = `${base}-${i}`;
    }
    this.slug = slug;
  }
  next();
});

shopSchema.virtual('isOpenNow').get(function () {
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

const ShopModel = model('Shop', shopSchema);

module.exports = { ShopModel };
