import mongoose from 'mongoose';
import NotificationModel from '../../models/Notification';

async function normalizeStatuses() {
  const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/manacity';
  await mongoose.connect(uri);

  await NotificationModel.updateMany(
    { type: 'interest' },
    { $set: { type: 'order' } }
  );

  await mongoose.disconnect();
}

normalizeStatuses()
  .then(() => {
    console.log('Status normalization completed');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Status normalization failed', err);
    process.exit(1);
  });
