const { Schema, model } = require('mongoose');

const coordinatesSchema = new Schema({
  lat: { type: Number },
  lng: { type: Number },
}, { _id: false });

const locationSchema = new Schema({
  type: { type: String, enum: ['online', 'venue'], required: true },
  address: { type: String },
  coordinates: { type: coordinatesSchema },
}, { _id: false });

function deriveStatus(e) {
  if (e.status === 'cancelled') return 'cancelled';
  const now = new Date();
  if (now < e.startAt) return 'upcoming';
  if (now >= e.startAt && now <= e.endAt) return 'active';
  return 'ended';
}

const eventSchema = new Schema({
  title: { type: String, required: true },
  slug: { type: String, required: true, unique: true },
  coverUrl: { type: String },
  description: { type: String, default: '' },
  category: { type: String, enum: ['gaming', 'sports', 'quiz', 'culture'], required: true },
  startAt: { type: Date, required: true },
  endAt: { type: Date, required: true },
  registrationClosesAt: { type: Date, required: true },
  status: { type: String, enum: ['upcoming', 'active', 'ended', 'cancelled'], default: 'upcoming' },
  capacity: { type: Number, required: true },
  registeredUsers: [{ type: Schema.Types.ObjectId, ref: 'User', default: [] }],
  registeredCount: { type: Number, default: 0 },
  organizerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  location: { type: locationSchema, required: true },
  isDeleted: { type: Boolean, default: false },
}, { timestamps: true });

eventSchema.pre('validate', function(next) {
  if (this.status !== 'cancelled') {
    this.status = deriveStatus(this);
  }
  next();
});

eventSchema.index({ slug: 1 }, { unique: true });
eventSchema.index({ status: 1, startAt: -1 });
eventSchema.index({ category: 1, startAt: -1 });

const Event = model('Event', eventSchema);

module.exports = Event;
