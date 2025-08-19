import { Schema, Document, model } from 'mongoose';
import { ShopAttrs } from './Shop';

export enum BusinessRequestStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

export interface BusinessRequestAttrs {
  userId: Schema.Types.ObjectId;
  shopDraft?: Partial<ShopAttrs>;
  status: BusinessRequestStatus;
  adminNotes?: string;
}

export interface BusinessRequestDoc
  extends Document,
    BusinessRequestAttrs {
  createdAt: Date;
  updatedAt: Date;
}

const businessRequestSchema = new Schema<BusinessRequestDoc>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    shopDraft: { type: Schema.Types.Mixed },
    status: {
      type: String,
      enum: Object.values(BusinessRequestStatus),
      default: BusinessRequestStatus.PENDING,
    },
    adminNotes: { type: String },
  },
  { timestamps: true }
);

businessRequestSchema.index({ userId: 1, status: 1, createdAt: -1 });

export const BusinessRequestModel = model<BusinessRequestDoc>(
  'BusinessRequest',
  businessRequestSchema
);

export default BusinessRequestModel;

