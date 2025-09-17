const { Schema, model } = require('mongoose');

const participantSchema = new Schema(
  {
    registration: { type: Schema.Types.ObjectId, ref: 'EventRegistration' },
    user: { type: Schema.Types.ObjectId, ref: 'User' },
    teamName: { type: String },
    displayName: { type: String },
    seed: { type: Number },
  },
  { _id: false }
);

const reportSchema = new Schema(
  {
    reportedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    scoreA: { type: Number },
    scoreB: { type: Number },
    note: { type: String },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const lobbySchema = new Schema(
  {
    roomId: { type: String },
    roomPass: { type: String },
    squadCode: { type: String },
    serverRegion: { type: String },
    custom: { type: Schema.Types.Mixed },
  },
  { _id: false }
);

const advanceSchema = new Schema(
  {
    match: { type: Schema.Types.ObjectId, ref: 'Match' },
    slot: { type: String, enum: ['A', 'B'] },
  },
  { _id: false }
);

const matchSchema = new Schema(
  {
    event: { type: Schema.Types.ObjectId, ref: 'Event', required: true, index: true },
    round: { type: Number, default: 1 },
    stage: { type: String },
    order: { type: Number, default: 0 },
    participantA: { type: participantSchema },
    participantB: { type: participantSchema },
    scoreA: { type: Number, default: 0 },
    scoreB: { type: Number, default: 0 },
    winner: { type: Schema.Types.ObjectId, ref: 'EventRegistration' },
    status: {
      type: String,
      enum: ['scheduled', 'open', 'reported', 'verified', 'disputed', 'closed'],
      default: 'scheduled',
    },
    reports: { type: [reportSchema], default: [] },
    lobbyInfo: { type: lobbySchema },
    advanceTo: { type: advanceSchema },
  },
  { timestamps: true }
);

matchSchema.index({ event: 1, round: 1, order: 1 });
matchSchema.index({ event: 1, status: 1 });

module.exports = model('Match', matchSchema);
