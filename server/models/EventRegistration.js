const { Schema, model } = require('mongoose');

const memberSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User' },
    ign: { type: String },
  },
  { _id: false }
);

const lobbySchema = new Schema(
  {
    squadCode: { type: String },
    roomId: { type: String },
    roomPass: { type: String },
    serverRegion: { type: String },
    notes: { type: String },
  },
  { _id: false }
);

const eventRegistrationSchema = new Schema(
  {
    event: { type: Schema.Types.ObjectId, ref: 'Event', required: true, index: true },
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    teamName: { type: String },
    ign: { type: String },
    contact: { type: String },
    members: { type: [memberSchema], default: [] },
    lobby: { type: lobbySchema },
    status: {
      type: String,
      enum: ['registered', 'waitlisted', 'checked_in', 'withdrawn', 'disqualified'],
      default: 'registered',
    },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

eventRegistrationSchema.index({ event: 1, user: 1 }, { unique: true });
eventRegistrationSchema.index({ event: 1, status: 1 });

module.exports = model('EventRegistration', eventRegistrationSchema);
