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
    serviceId: {
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
      enum: ['open', 'offered', 'assigned', 'completed', 'closed'],
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

ServiceRequestSchema.index({ createdAt: -1 });
ServiceRequestSchema.index({ visibility: 1, status: 1, createdAt: -1 });
ServiceRequestSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('ServiceRequest', ServiceRequestSchema);
