const { Schema, model } = require('mongoose');

const notificationSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: {
      type: String,
      enum: ['order', 'system', 'offer', 'event', 'service_request', 'announcement'],
      required: true,
    },
    subType: { type: String, trim: true },
    title: { type: String, trim: true },
    subtitle: { type: String, trim: true },
    message: { type: String, required: true },
    iconUrl: { type: String, trim: true },
    imageUrl: { type: String, trim: true },
    actionUrl: { type: String, trim: true },
    deepLink: { type: String, trim: true },
    payload: { type: Schema.Types.Mixed },
    metadata: { type: Schema.Types.Mixed },
    entityType: {
      type: String,
      enum: ['order', 'serviceRequest', 'event', 'announcement'],
    },
    entityId: { type: Schema.Types.ObjectId },
    redirectUrl: { type: String, trim: true },
    targetType: {
      type: String,
      enum: ['order', 'serviceRequest', 'event', 'announcement'],
    },
    targetId: { type: Schema.Types.ObjectId },
    targetLink: { type: String, trim: true },
    read: { type: Boolean, default: false },
    priority: {
      type: String,
      enum: ['low', 'normal', 'high'],
      default: 'normal',
    },
    pinned: {
      type: Boolean,
      default: false,
      index: true,
    },
    expiresAt: { type: Date },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

notificationSchema.index({ userId: 1, read: 1, createdAt: -1 });
notificationSchema.index(
  { expiresAt: 1 },
  {
    expireAfterSeconds: 0,
    partialFilterExpression: { expiresAt: { $type: 'date' } },
  }
);

const NotificationModel = model('Notification', notificationSchema);

module.exports = NotificationModel;
module.exports.NotificationModel = NotificationModel;
