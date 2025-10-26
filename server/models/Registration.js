const { Schema, model } = require('mongoose');
const { sanitizeHtml } = require('../utils/dynamicForm');

const paymentSchema = new Schema(
  {
    required: { type: Boolean, default: false },
    amount: { type: Number, min: 0 },
    currency: {
      type: String,
      enum: ['INR'],
      default: 'INR',
    },
    proofUrl: {
      type: String,
      set: (value) => sanitizeHtml(value),
    },
    paidProofUrl: {
      type: String,
      set: (value) => sanitizeHtml(value),
    },
  },
  { _id: false }
);

paymentSchema.pre('validate', function syncProofFields(next) {
  if (!this.paidProofUrl && this.proofUrl) {
    this.paidProofUrl = this.proofUrl;
  }
  if (!this.proofUrl && this.paidProofUrl) {
    this.proofUrl = this.paidProofUrl;
  }
  next();
});

const registrationSchema = new Schema(
  {
    eventId: { type: Schema.Types.ObjectId, ref: 'Event', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    data: {
      type: Map,
      of: Schema.Types.Mixed,
      default: () => new Map(),
    },
    status: {
      type: String,
      enum: ['submitted', 'accepted', 'rejected', 'waitlisted'],
      default: 'submitted',
    },
    payment: {
      type: paymentSchema,
      default: () => ({ required: false }),
    },
  },
  { timestamps: true }
);

registrationSchema.index({ eventId: 1, userId: 1 }, { unique: true });
registrationSchema.index({ eventId: 1, status: 1, createdAt: -1 });

registrationSchema.pre('save', function normalizeData(next) {
  if (this.payment && typeof this.payment.proofUrl === 'string') {
    this.payment.proofUrl = sanitizeHtml(this.payment.proofUrl);
  }
  if (this.payment && typeof this.payment.paidProofUrl === 'string') {
    this.payment.paidProofUrl = sanitizeHtml(this.payment.paidProofUrl);
  }
  if (this.data instanceof Map) {
    for (const [key, value] of this.data.entries()) {
      if (typeof value === 'string') {
        this.data.set(key, sanitizeHtml(value));
      }
    }
  }
  next();
});

module.exports = model('Registration', registrationSchema);
