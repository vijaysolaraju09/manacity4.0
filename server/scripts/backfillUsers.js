const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config();

async function run() {
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/test';
  await mongoose.connect(uri);

  const users = await User.find({});
  for (const user of users) {
    let modified = false;
    if (user.verificationStatus === undefined) {
      user.verificationStatus = 'none';
      modified = true;
    }
    if (user.isVerified === undefined) {
      user.isVerified = false;
      modified = true;
    }
    if (user.email) {
      const lower = user.email.toLowerCase();
      if (user.email !== lower) {
        user.email = lower;
        modified = true;
      }
      const conflict = await User.findOne({ email: user.email, _id: { $ne: user._id } });
      if (conflict) {
        console.log(`Email conflict for ${user._id}: ${user.email}`);
        user.email = undefined;
        modified = true;
      }
    }
    if (modified) {
      try {
        await user.save();
      } catch (err) {
        console.error('Failed to save user', user._id, err.message);
      }
    }
  }
  await mongoose.disconnect();
  console.log('Backfill complete');
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
