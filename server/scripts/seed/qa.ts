import mongoose, { Types } from 'mongoose';
import UserModel, { Role, VerificationStatus, BusinessStatus } from '../../models/User';
import Shop from '../../models/Shop';
import ProductModel from '../../models/Product';
import SpecialProduct from '../../models/SpecialProduct';
import Service from '../../models/Service';
import EventModel, { EventCategory } from '../../models/Event';

const QA_PHONE = '9000001111';
const QA_SHOP_NAME = 'QA Mart';
const QA_SERVICE_NAME = 'QA Delivery Support';
const QA_EVENT_TITLE = 'QA Community Launch';

const log = (message: string) => {
  console.log(`[seed:qa] ${message}`);
};

const ensureOwner = async () => {
  let owner = await UserModel.findOne({ phone: QA_PHONE });
  if (owner) {
    log(`Business owner already exists (${owner._id})`);
    return owner;
  }

  owner = await UserModel.create({
    phone: QA_PHONE,
    name: 'QA Business Owner',
    roles: [Role.BUSINESS],
    verificationStatus: VerificationStatus.VERIFIED,
    businessStatus: BusinessStatus.ACTIVE,
    bio: 'Seeded account for QA scenarios.',
    location: { city: 'Metropolis', pincode: '400001' },
    auth: { passwordHash: 'qa-seed-placeholder' },
    preferences: {
      theme: 'light',
      language: 'en',
      notifications: { orders: true, offers: true, system: true },
    },
  });
  log(`Created QA business owner (${owner._id})`);
  return owner;
};

const ensureShop = async (ownerId: Types.ObjectId) => {
  let shop = await Shop.findOne({ owner: ownerId, name: QA_SHOP_NAME });
  if (shop) {
    log(`Shop already exists (${shop._id})`);
    return shop;
  }

  shop = await Shop.create({
    owner: ownerId,
    name: QA_SHOP_NAME,
    category: 'groceries',
    location: 'Metropolis',
    address: '42 Market Street, Metropolis',
    description: 'Neighbourhood QA grocery shop seeded for demos.',
    status: 'approved',
    verified: true,
    isOpen: true,
  });
  log(`Created QA shop (${shop._id})`);
  return shop;
};

const ensureProducts = async (shopId: Types.ObjectId) => {
  const productDefinitions = [
    {
      title: 'QA Fresh Apples',
      description: 'Crisp Shimla apples picked for QA scenarios.',
      category: 'fruits',
      pricing: { mrp: 160, price: 140, currency: 'INR' },
    },
    {
      title: 'QA Premium Basmati Rice',
      description: 'Aromatic rice perfect for manual verification meals.',
      category: 'grains',
      pricing: { mrp: 999, price: 899, currency: 'INR' },
    },
    {
      title: 'QA Artisanal Bread',
      description: 'Baked daily to support regression breakfast runs.',
      category: 'bakery',
      pricing: { mrp: 120, price: 95, currency: 'INR' },
    },
  ];

  for (const def of productDefinitions) {
    const existing = await ProductModel.findOne({ shopId, title: def.title });
    if (existing) {
      log(`Product ${def.title} already present (${existing._id})`);
      continue;
    }
    const created = await ProductModel.create({
      shopId,
      title: def.title,
      description: def.description,
      category: def.category,
      pricing: def.pricing,
      status: 'active',
    });
    log(`Created product ${def.title} (${created._id})`);
  }
};

const ensureSpecialProducts = async (shopId: Types.ObjectId) => {
  const candidates = [
    {
      title: 'QA Festive Hamper',
      description: 'Curated delights for stakeholder demos.',
      price: 1299,
      mrp: 1499,
      stock: 20,
    },
    {
      title: 'QA Wellness Kit',
      description: 'Seeds with immunity boosters for testing long flows.',
      price: 799,
      mrp: 999,
      stock: 30,
    },
    {
      title: 'QA Midnight Snack Combo',
      description: 'Emergency snacks for late-night regression runs.',
      price: 499,
      mrp: 649,
      stock: 15,
    },
  ];

  const linkedProduct = await ProductModel.findOne({ shopId }).select('_id');

  for (const def of candidates) {
    const existing = await SpecialProduct.findOne({ title: def.title });
    if (existing) {
      log(`Special product ${def.title} already present (${existing._id})`);
      continue;
    }
    const created = await SpecialProduct.create({
      ...def,
      active: true,
      linkedProduct: linkedProduct?._id,
      ctaLabel: 'Order now',
      ctaType: 'product',
    });
    log(`Created special product ${def.title} (${created._id})`);
  }
};

const ensureService = async (ownerId: Types.ObjectId) => {
  const existing = await Service.findOne({ name: QA_SERVICE_NAME });
  if (existing) {
    log(`Service already exists (${existing._id})`);
    return existing;
  }
  const created = await Service.create({
    name: QA_SERVICE_NAME,
    description: 'Doorstep assistance for QA verification visits.',
    icon: 'truck',
    isActive: true,
    active: true,
    createdBy: ownerId,
  });
  log(`Created QA service (${created._id})`);
  return created;
};

const ensureEvent = async (organizerId: Types.ObjectId) => {
  const existing = await EventModel.findOne({ title: QA_EVENT_TITLE });
  if (existing) {
    log(`Event already exists (${existing._id})`);
    return existing;
  }

  const now = new Date();
  const startAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const endAt = new Date(startAt.getTime() + 3 * 60 * 60 * 1000);
  const registrationClosesAt = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);

  const created = await EventModel.create({
    title: QA_EVENT_TITLE,
    description: 'Connect with seeded merchants and run QA demos.',
    category: EventCategory.CULTURE,
    startAt,
    endAt,
    registrationClosesAt,
    capacity: 50,
    organizerId,
    location: { type: 'venue', address: 'QA Experience Center, Metropolis' },
  });
  log(`Created QA event (${created._id})`);
  return created;
};

const seed = async () => {
  const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/manacity';
  await mongoose.connect(uri);
  try {
    const owner = await ensureOwner();
    const shop = await ensureShop(owner._id as Types.ObjectId);
    await ensureProducts(shop._id as Types.ObjectId);
    await ensureSpecialProducts(shop._id as Types.ObjectId);
    await ensureService(owner._id as Types.ObjectId);
    await ensureEvent(owner._id as Types.ObjectId);
    log('QA seed completed successfully.');
  } catch (err) {
    console.error('[seed:qa] Failed to seed QA data', err);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
};

seed();
