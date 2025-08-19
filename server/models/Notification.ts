import { Schema, model, Types, Document } from 'mongoose';

export interface Cta {
  label: string;
  href: string;
}

export interface NotificationAttrs {
  userId: Types.ObjectId;
  type: 'order' | 'system' | 'offer' | 'event';
  title: string;
  body: string;
  cta?: Cta;
  isRead?: boolean;
  readAt?: Date;
}

export interface NotificationDoc extends Document, NotificationAttrs {}

const CtaSchema = new Schema<Cta>(
  {
    label: { type: String, required: true },
    href: { type: String, required: true },
  },
  { _id: false }
);

const notificationSchema = new Schema<NotificationDoc>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: {
      type: String,
      enum: ['order', 'system', 'offer', 'event'],
      required: true,
    },
    title: { type: String, required: true },
    body: { type: String, required: true },
    cta: { type: CtaSchema },
    isRead: { type: Boolean, default: false },
    readAt: { type: Date },
  },
  { timestamps: true }
);

notificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });

export const NotificationModel = model<NotificationDoc>('Notification', notificationSchema);
export default NotificationModel;
