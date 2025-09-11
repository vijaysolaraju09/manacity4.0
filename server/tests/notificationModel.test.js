const mongoose = require('mongoose');
const { NotificationModel } = require('../models/Notification');

describe('Notification schema', () => {
  it('requires userId, type, and message', async () => {
    const notif = new NotificationModel({});
    await expect(notif.validate()).rejects.toThrow();
  });

  it('defaults read to false', async () => {
    const notif = new NotificationModel({
      userId: new mongoose.Types.ObjectId(),
      type: 'system',
      message: 'Body',
    });
    await notif.validate();
    expect(notif.read).toBe(false);
  });

  it('has compound index on userId, read, createdAt', () => {
    const indexes = NotificationModel.schema.indexes();
    const compound = indexes.find(
      ([idx]) => idx.userId === 1 && idx.read === 1 && idx.createdAt === -1
    );
    expect(compound).toBeDefined();
  });
});
