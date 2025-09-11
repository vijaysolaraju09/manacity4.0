import mongoose from 'mongoose';
import Shop from '../../models/Shop';
import ProductModel from '../../models/Product';
import EventModel from '../../models/Event';
import { generateSlug } from '../../utils/slug';

async function backfillSlugs() {
  const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/manacity';
  await mongoose.connect(uri);

  const tasks = [
    { model: Shop, field: 'name' as const },
    { model: ProductModel, field: 'title' as const },
    { model: EventModel, field: 'title' as const },
  ];

  for (const { model, field } of tasks) {
    const docs = await model.find({ $or: [ { slug: { $exists: false } }, { slug: '' } ] });
    if (!docs.length) continue;
    for (const doc of docs) {
      const base = (doc as any)[field];
      if (!base) continue;
      (doc as any).slug = await generateSlug(model as any, base);
      await doc.save();
    }
  }

  await mongoose.disconnect();
}

backfillSlugs()
  .then(() => {
    console.log('Slug backfill completed');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Slug backfill failed', err);
    process.exit(1);
  });
