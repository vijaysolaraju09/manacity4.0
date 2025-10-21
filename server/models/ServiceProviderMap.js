const mongoose = require('mongoose');

const ServiceProviderMapSchema = new mongoose.Schema(
  {
    serviceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Service',
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    ratingAvg: {
      type: Number,
      default: null,
    },
    ratingCount: {
      type: Number,
      default: 0,
    },
    notes: {
      type: String,
      default: '',
      maxlength: 500,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

ServiceProviderMapSchema.index({ serviceId: 1, userId: 1 }, { unique: true });
ServiceProviderMapSchema.index({ isActive: 1 });

module.exports = mongoose.model('ServiceProviderMap', ServiceProviderMapSchema);
