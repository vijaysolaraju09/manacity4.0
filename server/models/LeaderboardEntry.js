const { Schema, model } = require('mongoose');

const leaderboardEntrySchema = new Schema(
  {
    event: { type: Schema.Types.ObjectId, ref: 'Event', required: true, index: true },
    participantId: { type: Schema.Types.ObjectId },
    user: { type: Schema.Types.ObjectId, ref: 'User' },
    teamName: { type: String },
    displayName: { type: String },
    avatarUrl: { type: String },
    points: { type: Number, default: 0 },
    rank: { type: Number },
    wins: { type: Number },
    losses: { type: Number },
    kills: { type: Number },
    time: { type: Number },
    seed: { type: Number },
    tieBreaker: { type: Number },
    prize: { type: String },
    payout: { type: Number },
    metadata: { type: Schema.Types.Mixed },
    stats: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

leaderboardEntrySchema.index({ event: 1, rank: 1 });
leaderboardEntrySchema.index({ event: 1, points: -1 });
leaderboardEntrySchema.index({ event: 1, participantId: 1 }, { unique: false });

module.exports = model('LeaderboardEntry', leaderboardEntrySchema);
