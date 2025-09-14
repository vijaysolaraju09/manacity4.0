import mongoose from 'mongoose';
import User from '../../models/User';

async function backfillUserFields() {
  const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/manacity';
  await mongoose.connect(uri);

  await User.updateMany(
    { verificationStatus: { $exists: false }, isVerified: true },
    { $set: { verificationStatus: 'approved' } }
  );

  await User.updateMany(
    { verificationStatus: { $exists: false } },
    { $set: { verificationStatus: 'none' } }
  );

  await User.updateMany(
    { status: { $exists: false } },
    { $set: { status: 'active' } }
  );

  await mongoose.disconnect();
}

backfillUserFields()
  .then(() => {
    console.log('User backfill completed');
    process.exit(0);
  })
  .catch((err) => {
    console.error('User backfill failed', err);
    process.exit(1);
  });

