const { Schema, model } = require('mongoose');

// Leaderboard entry schema used for tournaments
const leaderboardEntrySchema = new Schema(
  {
    participantId: { type: Schema.Types.ObjectId },
    teamName: { type: String },
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    points: { type: Number, default: 0 },
    rank: { type: Number },
    wins: { type: Number },
    losses: { type: Number },
    kills: { type: Number },
    time: { type: Number },
  },
  { _id: false }
);

const geoSchema = new Schema(
  {
    lat: Number,
    lng: Number,
  },
  { _id: false }
);

const eventSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 140,
    },
    type: {
      type: String,
      enum: ['tournament', 'activity'],
      required: true,
    },
    category: { type: String, required: true },
    format: {
      type: String,
      enum: ['knockout', 'round_robin', 'points', 'single_match', 'custom'],
    },
    teamSize: { type: Number, default: 1 },
    maxParticipants: { type: Number, required: true },
    registeredCount: { type: Number, default: 0 },
    visibility: {
      type: String,
      enum: ['public', 'private'],
      default: 'public',
    },
    status: {
      type: String,
      enum: ['draft', 'published', 'ongoing', 'completed', 'canceled'],
      default: 'draft',
    },
    description: { type: String, default: '', maxlength: 4000 },
    rules: { type: String, default: '', maxlength: 4000 },
    prizePool: { type: String },
    bannerUrl: { type: String },
    coverUrl: { type: String },
    timezone: { type: String, default: 'Asia/Kolkata' },
    registrationOpenAt: { type: Date, required: true },
    registrationCloseAt: { type: Date, required: true },
    startAt: { type: Date, required: true },
    endAt: { type: Date },
    mode: { type: String, enum: ['online', 'venue'], default: 'online' },
    venue: { type: String },
    geo: { type: geoSchema },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    updatesCount: { type: Number, default: 0 },
    leaderboardVersion: { type: Number, default: 0 },
    leaderboard: { type: [leaderboardEntrySchema], default: [] },
  },
  { timestamps: true }
);

// Indexes
// for listings and filtering
// status + category + startAt
eventSchema.index({ status: 1, category: 1, startAt: -1 });
// optional text search
try {
  eventSchema.index({ title: 'text', description: 'text', rules: 'text' });
} catch (e) {
  // ignore for mongoose text index creation errors in tests
}

// Projection helpers
eventSchema.methods.toCardJSON = function toCardJSON() {
  return {
    id: this._id.toString(),
    _id: this._id,
    title: this.title,
    type: this.type,
    category: this.category,
    teamSize: this.teamSize,
    maxParticipants: this.maxParticipants,
    registeredCount: this.registeredCount,
    startAt: this.startAt,
    registrationOpenAt: this.registrationOpenAt,
    registrationCloseAt: this.registrationCloseAt,
    status: this.status,
    bannerUrl: this.bannerUrl || null,
    mode: this.mode,
    venue: this.venue,
  };
};

eventSchema.methods.toDetailJSON = function toDetailJSON() {
  const base = this.toCardJSON();
  return {
    ...base,
    endAt: this.endAt,
    timezone: this.timezone,
    description: this.description,
    rules: this.rules,
    prizePool: this.prizePool,
    coverUrl: this.coverUrl || null,
  };
};

module.exports = model('Event', eventSchema);
