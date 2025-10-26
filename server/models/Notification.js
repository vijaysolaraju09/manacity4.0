const { Schema, model } = require('mongoose');

const notificationSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: {
      type: String,
      enum: ['order', 'system', 'offer', 'event', 'service_request'],
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
    read: { type: Boolean, default: false },
    priority: {
      type: String,
      enum: ['low', 'normal', 'high'],
      default: 'normal',
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

module.exports = model('Notification', notificationSchema);
