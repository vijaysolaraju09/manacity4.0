import { Schema, model, Document, Types } from 'mongoose';
import { EventModel } from './Event';

export enum RegistrationStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

export interface RegistrationAttrs {
  eventId: Types.ObjectId;
  userId: Types.ObjectId;
  status?: RegistrationStatus;
  registeredAt?: Date;
  approvedAt?: Date;
}

export interface RegistrationDoc extends Document<RegistrationAttrs>, RegistrationAttrs {
  createdAt: Date;
  updatedAt: Date;
}

const registrationSchema = new Schema<RegistrationDoc>({
  eventId: { type: Schema.Types.ObjectId, ref: 'Event', required: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  status: { type: String, enum: Object.values(RegistrationStatus), default: RegistrationStatus.PENDING },
  registeredAt: { type: Date, default: Date.now },
  approvedAt: { type: Date },
}, { timestamps: true });

registrationSchema.index({ eventId: 1, userId: 1 }, { unique: true });

registrationSchema.pre('save', async function(next) {
  this.$locals.wasNew = this.isNew;
  if (!this.isNew) {
    const existing = await (this.constructor as any).findById(this._id).select('status');
    this.$locals.prevStatus = existing ? existing.status : undefined;
  }
  if (this.isModified('status') && this.status === RegistrationStatus.APPROVED && !this.approvedAt) {
    this.approvedAt = new Date();
  }
  next();
});

registrationSchema.post('save', async function(doc, next) {
  let inc = 0;
  const prev = this.$locals.prevStatus;
  if (this.$locals.wasNew) {
    if (doc.status === RegistrationStatus.APPROVED) inc = 1;
  } else if (prev !== doc.status) {
    if (prev !== RegistrationStatus.APPROVED && doc.status === RegistrationStatus.APPROVED) inc = 1;
    else if (prev === RegistrationStatus.APPROVED && doc.status !== RegistrationStatus.APPROVED) inc = -1;
  }
  if (inc !== 0) {
    await EventModel.findByIdAndUpdate(doc.eventId, { $inc: { registeredCount: inc } });
  }
  next();
});

registrationSchema.post('findOneAndDelete', async function(doc, next) {
  if (doc && doc.status === RegistrationStatus.APPROVED) {
    await EventModel.findByIdAndUpdate(doc.eventId, { $inc: { registeredCount: -1 } });
  }
  next();
});

export const RegistrationModel = model<RegistrationDoc>('Registration', registrationSchema);

export default RegistrationModel;
