const { Schema, model } = require('mongoose');

const leaderboardEntrySchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    score: { type: Number, required: true },
  },
  { _id: false }
);

const eventSchema = new Schema(
  {
    title: { type: String, required: true },
    cover: { type: String },
    startsAt: { type: Date, required: true },
    endsAt: { type: Date, required: true },
    price: { type: Number, default: 0 },
    registered: [{ type: Schema.Types.ObjectId, ref: 'User', default: [] }],
    status: {
      type: String,
      enum: ['draft', 'open', 'closed', 'finished'],
      default: 'draft',
    },
    leaderboard: { type: [leaderboardEntrySchema], default: [] },
  },
  { timestamps: true }
);

module.exports = model('Event', eventSchema);
