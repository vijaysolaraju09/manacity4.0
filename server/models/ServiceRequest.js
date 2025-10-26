const mongoose = require('mongoose');

const offerSchema = new mongoose.Schema(
  {
    providerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    note: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: '',
    },
    contact: {
      type: String,
      trim: true,
      maxlength: 120,
      default: '',
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected'],
      default: 'pending',
    },
  },
  { _id: true }
);

const historySchema = new mongoose.Schema(
  {
    at: {
      type: Date,
      default: Date.now,
    },
    by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    type: {
      type: String,
      enum: ['created', 'offer', 'assigned', 'completed', 'closed', 'reopened', 'admin_note'],
      required: true,
    },
    message: {
      type: String,
      trim: true,
      default: null,
    },
  },
  { _id: false }
);

const ServiceRequestSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    serviceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Service',
      default: null,
    },
    service: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Service',
      default: null,
    },
    customName: {
      type: String,
      trim: true,
      maxlength: 150,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
    desc: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
    location: {
      type: String,
      trim: true,
      maxlength: 250,
    },
    phone: {
      type: String,
      trim: true,
      maxlength: 32,
    },
    visibility: {
      type: String,
      enum: ['public', 'private'],
      default: 'public',
      index: true,
    },
    preferredDate: {
      type: String,
      trim: true,
      maxlength: 50,
    },
    preferredTime: {
      type: String,
      trim: true,
      maxlength: 50,
    },
    status: {
      type: String,
      enum: [
        'open',
        'offered',
        'assigned',
        'in_progress',
        'completed',
        'closed',
        'OPEN',
        'ASSIGNED',
        'IN_PROGRESS',
        'COMPLETED',
        'CLOSED',
      ],
      default: 'open',
      index: true,
    },
    reopenedCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    adminNotes: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
    assignedProviderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    provider: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    assignedProviderIds: {
      type: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
      ],
      default: [],
    },
    offers: {
      type: [offerSchema],
      default: [],
    },
    history: {
      type: [historySchema],
      default: [],
    },
    isAnonymizedPublic: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

const normalizeStatusValue = (value) => {
  if (!value) return 'open';
  const raw = String(value).trim();
  if (!raw) return 'open';
  const upper = raw.toUpperCase();
  if (upper === 'IN_PROGRESS') return 'in_progress';
  if (['OPEN', 'ASSIGNED', 'COMPLETED', 'CLOSED'].includes(upper)) {
    return upper.toLowerCase();
  }
  const lower = raw.toLowerCase();
  if (
    ['open', 'offered', 'assigned', 'completed', 'closed', 'in_progress'].includes(
      lower
    )
  ) {
    return lower;
  }
  return 'open';
};

const syncRequestFields = (doc) => {
  if (!doc) return;
  if (doc.user && !doc.userId) doc.userId = doc.user;
  if (!doc.user && doc.userId) doc.user = doc.userId;

  if (doc.service && !doc.serviceId) doc.serviceId = doc.service;
  if (!doc.service && doc.serviceId) doc.service = doc.serviceId;

  if (typeof doc.desc === 'string' && !doc.description) doc.description = doc.desc;
  if (typeof doc.description === 'string' && !doc.desc) doc.desc = doc.description;

  if (doc.provider && !doc.assignedProviderId)
    doc.assignedProviderId = doc.provider;
  if (!doc.provider && doc.assignedProviderId) doc.provider = doc.assignedProviderId;

  if (typeof doc.status !== 'undefined') {
    doc.status = normalizeStatusValue(doc.status);
  }
};

const ensurePairedField = (target, primary, secondary) => {
  if (!target) return;
  const hasPrimary = Object.prototype.hasOwnProperty.call(target, primary);
  const hasSecondary = Object.prototype.hasOwnProperty.call(target, secondary);
  if (hasPrimary && !hasSecondary) target[secondary] = target[primary];
  else if (hasSecondary && !hasPrimary) target[primary] = target[secondary];
};

const syncUpdateFields = (update = {}) => {
  const apply = (target = {}) => {
    ensurePairedField(target, 'user', 'userId');
    ensurePairedField(target, 'service', 'serviceId');
    ensurePairedField(target, 'desc', 'description');
    ensurePairedField(target, 'provider', 'assignedProviderId');

    if (Object.prototype.hasOwnProperty.call(target, 'status')) {
      target.status = normalizeStatusValue(target.status);
    }
  };

  apply(update);
  if (update.$set) apply(update.$set);
  if (update.$setOnInsert) apply(update.$setOnInsert);

  return update;
};

ServiceRequestSchema.pre('validate', function (next) {
  syncRequestFields(this);
  next();
});

ServiceRequestSchema.pre('save', function (next) {
  syncRequestFields(this);
  next();
});

ServiceRequestSchema.pre('findOneAndUpdate', function (next) {
  this.setUpdate(syncUpdateFields(this.getUpdate() || {}));
  next();
});

ServiceRequestSchema.index({ createdAt: -1 });
ServiceRequestSchema.index({ visibility: 1, status: 1, createdAt: -1 });
ServiceRequestSchema.index({ userId: 1, createdAt: -1 });
ServiceRequestSchema.index({ provider: 1, createdAt: -1 });
ServiceRequestSchema.index({ assignedProviderId: 1, createdAt: -1 });

module.exports = mongoose.model('ServiceRequest', ServiceRequestSchema);
