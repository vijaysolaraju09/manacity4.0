const { Schema, model } = require('mongoose');

const eventUpdateSchema = new Schema(
  {
    event: { type: Schema.Types.ObjectId, ref: 'Event', required: true, index: true },
    type: { type: String, enum: ['pre', 'live', 'post'], default: 'pre' },
    message: { type: String, required: true, maxlength: 2000 },
    postedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    isPinned: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = model('EventUpdate', eventUpdateSchema);
