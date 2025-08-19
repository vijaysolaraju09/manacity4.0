const mongoose = require('mongoose');

const ctaSchema = new mongoose.Schema(
  {
    label: { type: String, required: true },
    href: { type: String, required: true },
  },
  { _id: false }
);

const notificationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: {
      type: String,
      enum: ['order', 'system', 'offer', 'event'],
      required: true,
    },
    title: { type: String, required: true },
    body: { type: String, required: true },
    cta: ctaSchema,
    isRead: { type: Boolean, default: false },
    readAt: { type: Date },
  },
  { timestamps: true }
);

notificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });

const NotificationModel = mongoose.model('Notification', notificationSchema);

module.exports = { NotificationModel };
module.exports.default = NotificationModel;
