const mongoose = require('mongoose');
const { NotificationModel } = require('../models/Notification');

describe('Notification schema', () => {
  it('requires userId, type, title, and body', async () => {
    const notif = new NotificationModel({});
    await expect(notif.validate()).rejects.toThrow();
  });

  it('defaults isRead to false', async () => {
    const notif = new NotificationModel({
      userId: new mongoose.Types.ObjectId(),
      type: 'system',
      title: 'Test',
      body: 'Body',
    });
    await notif.validate();
    expect(notif.isRead).toBe(false);
  });

  it('has compound index on userId, isRead, createdAt', () => {
    const indexes = NotificationModel.schema.indexes();
    const compound = indexes.find(
      ([idx]) => idx.userId === 1 && idx.isRead === 1 && idx.createdAt === -1
    );
    expect(compound).toBeDefined();
  });
});
