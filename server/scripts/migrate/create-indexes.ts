import mongoose from 'mongoose';
import ShopModel from '../../models/Shop';
import ProductModel from '../../models/Product';
import EventModel from '../../models/Event';
import OrderModel from '../../models/Order';
import UserModel from '../../models/User';
import NotificationModel from '../../models/Notification';

async function createIndexes() {
  const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/manacity';
  await mongoose.connect(uri);

  await Promise.all([
    ShopModel.syncIndexes(),
    ProductModel.syncIndexes(),
    EventModel.syncIndexes(),
    OrderModel.syncIndexes(),
    UserModel.syncIndexes(),
    NotificationModel.syncIndexes(),
  ]);

  await mongoose.disconnect();
}

createIndexes()
  .then(() => {
    console.log('Index creation completed');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Index creation failed', err);
    process.exit(1);
  });
