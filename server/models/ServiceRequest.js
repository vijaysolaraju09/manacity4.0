const mongoose = require('mongoose');

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
      enum: ['open', 'assigned', 'closed', 'rejected'],
      default: 'open',
      index: true,
    },
    adminNotes: {
      type: String,
      trim: true,
      maxlength: 1000,
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
  },
  { timestamps: true }
);

ServiceRequestSchema.index({ createdAt: -1 });

module.exports = mongoose.model('ServiceRequest', ServiceRequestSchema);
