const mongoose = require('mongoose');

const historySchema = new mongoose.Schema(
  {
    at: { type: Date, default: Date.now },
    by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    type: { type: String, required: true },
    message: { type: String, trim: true, default: null },
  },
  { _id: false },
);

const ServiceRequestSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    serviceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Service', default: null },
    service: { type: mongoose.Schema.Types.ObjectId, ref: 'Service', default: null },
    title: { type: String, trim: true, maxlength: 150 },
    customName: { type: String, trim: true, maxlength: 150 },
    description: { type: String, trim: true, maxlength: 2000 },
    details: { type: String, trim: true, maxlength: 2000 },
    desc: { type: String, trim: true, maxlength: 2000 },
    message: { type: String, trim: true, maxlength: 2000 },
    location: { type: String, trim: true, maxlength: 250 },
    paymentOffer: { type: String, trim: true, maxlength: 120 },
    phone: { type: String, trim: true, maxlength: 32 },
    type: {
      type: String,
      enum: ['public', 'private', 'direct'],
      default: 'public',
      index: true,
    },
    visibility: {
      type: String,
      enum: ['public', 'private', 'direct'],
      default: 'public',
      index: true,
    },
    directTargetUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    status: {
      type: String,
      enum: ['Pending', 'AwaitingApproval', 'Accepted', 'InProgress', 'Completed', 'Rejected', 'Cancelled'],
      default: 'Pending',
      index: true,
    },
    acceptedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    acceptedAt: { type: Date, default: null },
    assignedProviderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    assignedProviderIds: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
      default: [],
    },
    providerNote: { type: String, trim: true, maxlength: 2000 },
    adminNotes: { type: String, trim: true, maxlength: 1000 },
    history: { type: [historySchema], default: [] },
    isAnonymizedPublic: { type: Boolean, default: true },
  },
  { timestamps: true },
);

const normalizeStatus = (value) => {
  if (!value) return 'Pending';
  const normalized = String(value).trim().toLowerCase();
  if (normalized === 'pending' || normalized === 'open' || normalized === 'offered') return 'Pending';
  if (normalized === 'accepted' || normalized === 'assigned') return 'Accepted';
  if (normalized === 'awaitingapproval') return 'AwaitingApproval';
  if (normalized === 'inprogress' || normalized === 'in_progress' || normalized === 'in-progress')
    return 'InProgress';
  if (normalized === 'completed' || normalized === 'complete') return 'Completed';
  if (normalized === 'cancelled' || normalized === 'canceled' || normalized === 'closed') return 'Cancelled';
  if (normalized === 'rejected') return 'Rejected';
  return 'Pending';
};

const syncRequestFields = (doc) => {
  if (!doc) return;
  if (doc.user && !doc.userId) doc.userId = doc.user;
  if (!doc.user && doc.userId) doc.user = doc.userId;
  if (doc.service && !doc.serviceId) doc.serviceId = doc.service;
  if (!doc.service && doc.serviceId) doc.service = doc.serviceId;
  if (typeof doc.desc === 'string' && !doc.description) doc.description = doc.desc;
  if (typeof doc.description === 'string' && !doc.desc) doc.desc = doc.description;
  if (doc.visibility && !doc.type) doc.type = doc.visibility;
  if (doc.type && !doc.visibility) doc.visibility = doc.type;
  if (doc.type && doc.visibility && doc.type !== doc.visibility) {
    doc.type = doc.visibility = doc.visibility === 'private' ? 'private' : doc.type;
  }
  if (doc.status) doc.status = normalizeStatus(doc.status);
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
    ensurePairedField(target, 'type', 'visibility');
    if (Object.prototype.hasOwnProperty.call(target, 'status')) {
      target.status = normalizeStatus(target.status);
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
ServiceRequestSchema.index({ assignedProviderId: 1, createdAt: -1 });
ServiceRequestSchema.index({ directTargetUserId: 1, createdAt: -1 });

module.exports = mongoose.model('ServiceRequest', ServiceRequestSchema);
