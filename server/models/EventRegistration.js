const { Schema, model } = require('mongoose');

const eventRegistrationSchema = new Schema(
  {
    event: { type: Schema.Types.ObjectId, ref: 'Event', required: true, index: true },
    teamName: { type: String },
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    members: [{ type: Schema.Types.ObjectId, ref: 'User', default: [] }],
    ign: { type: String },
    status: {
      type: String,
      enum: ['registered', 'waitlisted', 'checked_in', 'withdrawn', 'disqualified'],
      default: 'registered',
    },
  },
  { timestamps: true }
);

eventRegistrationSchema.index({ event: 1, user: 1 }, { unique: true });

module.exports = model('EventRegistration', eventRegistrationSchema);
