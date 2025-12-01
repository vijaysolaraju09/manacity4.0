const mongoose = require('mongoose');

const OfferSchema = new mongoose.Schema(
  {
    requestId: { type: mongoose.Schema.Types.ObjectId, ref: 'ServiceRequest', required: true, index: true },
    helperId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    helperNote: { type: String, trim: true, maxlength: 2000 },
    expectedReturn: { type: String, trim: true, maxlength: 120 },
    status: {
      type: String,
      enum: ['Pending', 'AcceptedBySeeker', 'RejectedBySeeker'],
      default: 'Pending',
      index: true,
    },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: false },
);

OfferSchema.index({ requestId: 1, helperId: 1 }, { unique: true });

module.exports = mongoose.model('Offer', OfferSchema);
