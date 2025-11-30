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
    details: {
      type: String,
      trim: true,
      maxlength: 2000,
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
    type: {
      type: String,
      enum: ['public', 'private'],
      default: 'public',
      index: true,
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
        'pending',
        'accepted',
        'assigned',
        'in_progress',
        'completed',
        'cancelled',
        // Legacy values are kept in the enum so that existing records continue to
        // validate. The pre-save hooks normalise them into the modern status
        // names.
        'open',
        'offered',
        'closed',
        'OPEN',
        'ASSIGNED',
        'IN_PROGRESS',
        'COMPLETED',
        'CLOSED',
      ],
      default: 'pending',
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
    acceptedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
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
  if (!value) return 'pending';
  const raw = String(value).trim();
  if (!raw) return 'pending';

  const lower = raw.toLowerCase();

  if (['pending', 'accepted', 'assigned', 'in_progress', 'completed', 'cancelled'].includes(lower)) {
    return lower;
  }

  if (lower === 'open' || lower === 'offered') return 'pending';
  if (lower === 'closed') return 'cancelled';
  if (lower === 'in-progress') return 'in_progress';
  if (lower === 'complete') return 'completed';

  const upper = raw.toUpperCase();
  if (upper === 'IN_PROGRESS') return 'in_progress';
  if (upper === 'COMPLETED') return 'completed';
  if (upper === 'ASSIGNED') return 'assigned';
  if (upper === 'OPEN' || upper === 'OFFERED') return 'pending';
  if (upper === 'CLOSED') return 'cancelled';

  return 'pending';
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

  if (doc.visibility && !doc.type) doc.type = doc.visibility;
  if (doc.type && !doc.visibility) doc.visibility = doc.type;
  if (doc.type && doc.visibility && doc.type !== doc.visibility) {
    doc.type = doc.visibility = doc.visibility === 'private' ? 'private' : 'public';
  }

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
    ensurePairedField(target, 'type', 'visibility');

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
