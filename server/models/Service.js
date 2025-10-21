const mongoose = require('mongoose');

const ServiceSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      minlength: 2,
      maxlength: 120,
    },
    description: {
      type: String,
      default: '',
      maxlength: 500,
      trim: true,
    },
    icon: {
      type: String,
      default: '',
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { timestamps: true }
);

ServiceSchema.index({ name: 1 }, { unique: true });
ServiceSchema.index({ isActive: 1, name: 1 });

module.exports = mongoose.model('Service', ServiceSchema);
