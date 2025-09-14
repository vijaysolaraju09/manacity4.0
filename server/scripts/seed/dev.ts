import mongoose from 'mongoose';
import Shop from '../../models/Shop';
import ProductModel from '../../models/Product';
import EventModel, { EventCategory } from '../../models/Event';
import UserModel, { Role, VerificationStatus, BusinessStatus } from '../../models/User';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const Verified = require('../../models/Verified');

async function seed() {
  const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/manacity';
  await mongoose.connect(uri);

  // Clean database for deterministic seeds
  await mongoose.connection.db.dropDatabase();

  const cityNames = ['Alpha', 'Beta'];
  const shopOwners: any[] = [];

  // Create shops and products
  for (let i = 0; i < cityNames.length * 5; i++) {
    const city = cityNames[Math.floor(i / 5)];
    const owner = await UserModel.create({
      phone: `+15000000${i}`,
      name: `Owner ${i}`,
      roles: [Role.BUSINESS],
      verificationStatus: VerificationStatus.VERIFIED,
      businessStatus: BusinessStatus.ACTIVE,
      location: { city, pincode: `1000${i}` },
      auth: { passwordHash: `hash${i}` },
    });
    shopOwners.push(owner);
    const shop = await Shop.create({
      owner: owner._id,
      name: `Shop ${i}`,
      category: 'general',
      address: {
        label: 'Main',
        line1: 'Street 1',
        city,
        state: 'State',
        pincode: `1000${i}`,
        isDefault: true,
      },
    });
    for (let p = 0; p < 10; p++) {
      await ProductModel.create({
        shopId: shop._id,
        title: `Product ${p} of Shop ${i}`,
        category: 'misc',
        pricing: { mrp: 100, price: 90, currency: 'USD' },
      });
    }
  }

  // Events
  const organizer = shopOwners[0];
  for (let e = 0; e < 3; e++) {
    const start = new Date();
    const end = new Date(start.getTime() + 3600000);
    await EventModel.create({
      title: `Event ${e}`,
      category: EventCategory.CULTURE,
      startAt: start,
      endAt: end,
      registrationClosesAt: start,
      capacity: 100,
      organizerId: organizer._id,
      location: { type: 'online' },
    });
  }

  // Verified professionals
  for (let i = 0; i < 10; i++) {
    const city = cityNames[i % cityNames.length];
    const user = await UserModel.create({
      phone: `+16000000${i}`,
      name: `Pro ${i}`,
      roles: [Role.VERIFIED],
      verificationStatus: VerificationStatus.VERIFIED,
      location: { city, pincode: `2000${i}` },
      auth: { passwordHash: `prohash${i}` },
    });
    await Verified.create({
      user: user._id,
      profession: `Profession ${i}`,
      bio: 'Experienced professional',
      status: 'approved',
    });
  }

  await mongoose.disconnect();
}

seed()
  .then(() => {
    console.log('Seeding completed');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Seeding failed', err);
    process.exit(1);
  });
