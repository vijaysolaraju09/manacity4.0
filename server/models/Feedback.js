const { Schema, model, Types } = require('mongoose');

const SUBJECT_TYPES = ['order', 'service_request', 'event'];

const feedbackSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    subjectType: { type: String, enum: SUBJECT_TYPES, required: true },
    subjectId: { type: Schema.Types.ObjectId, required: true },
    rating: { type: Number, min: 1, max: 5, default: null },
    comment: { type: String, trim: true, maxlength: 1000, default: '' },
  },
  { timestamps: true },
);

feedbackSchema.index({ user: 1, subjectType: 1, subjectId: 1 }, { unique: true });

feedbackSchema.statics.isValidSubjectId = (value) => Types.ObjectId.isValid(value);

module.exports = model('Feedback', feedbackSchema);
