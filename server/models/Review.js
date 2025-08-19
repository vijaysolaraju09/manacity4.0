const { Schema, model } = require('mongoose');

const reviewSchema = new Schema(
  {
    subjectType: { type: String, enum: ['shop', 'product', 'professional'], required: true },
    subjectId: { type: Schema.Types.ObjectId, required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, default: '' },
  },
  { timestamps: true }
);

reviewSchema.index({ subjectType: 1, subjectId: 1, rating: -1 });

const ReviewModel = model('Review', reviewSchema);

module.exports = { ReviewModel };

