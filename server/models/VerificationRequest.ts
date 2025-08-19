import { Schema, Document, model } from 'mongoose';

export enum VerificationRequestStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

export interface VerificationRequestAttrs {
  userId: Schema.Types.ObjectId;
  profession: string;
  bio?: string;
  status: VerificationRequestStatus;
  adminNotes?: string;
}

export interface VerificationRequestDoc
  extends Document,
    VerificationRequestAttrs {
  createdAt: Date;
  updatedAt: Date;
}

const verificationRequestSchema = new Schema<VerificationRequestDoc>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    profession: { type: String, required: true },
    bio: { type: String, default: '' },
    status: {
      type: String,
      enum: Object.values(VerificationRequestStatus),
      default: VerificationRequestStatus.PENDING,
    },
    adminNotes: { type: String },
  },
  { timestamps: true }
);

verificationRequestSchema.index({ userId: 1, status: 1, createdAt: -1 });

export const VerificationRequestModel = model<VerificationRequestDoc>(
  'VerificationRequest',
  verificationRequestSchema
);

export default VerificationRequestModel;

