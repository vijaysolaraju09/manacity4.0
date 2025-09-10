import { Schema, model, Document, Types } from 'mongoose';
import { generateSlug } from '../utils/slug';

export enum EventCategory {
  GAMING = 'gaming',
  SPORTS = 'sports',
  QUIZ = 'quiz',
  CULTURE = 'culture',
}

export enum EventStatus {
  UPCOMING = 'upcoming',
  ACTIVE = 'active',
  ENDED = 'ended',
  CANCELLED = 'cancelled',
}

interface Coordinates {
  lat: number;
  lng: number;
}

interface Location {
  type: 'online' | 'venue';
  address?: string;
  coordinates?: Coordinates;
}

const CoordinatesSchema = new Schema<Coordinates>({
  lat: { type: Number },
  lng: { type: Number },
}, { _id: false });

const LocationSchema = new Schema<Location>({
  type: { type: String, enum: ['online', 'venue'], required: true },
  address: { type: String },
  coordinates: { type: CoordinatesSchema },
}, { _id: false });

export interface EventAttrs {
  title: string;
  slug?: string;
  coverUrl?: string;
  description?: string;
  category: EventCategory;
  startAt: Date;
  endAt: Date;
  registrationClosesAt: Date;
  status?: EventStatus;
  capacity: number;
  registeredUsers?: Types.ObjectId[];
  registeredCount?: number;
  organizerId: Types.ObjectId;
  location: Location;
  isDeleted?: boolean;
}

export interface EventDoc extends Document<EventAttrs>, EventAttrs {
  createdAt: Date;
  updatedAt: Date;
}

function deriveStatus(e: EventAttrs): EventStatus {
  if (e.status === EventStatus.CANCELLED) return EventStatus.CANCELLED;
  const now = new Date();
  if (now < e.startAt) return EventStatus.UPCOMING;
  if (now >= e.startAt && now <= e.endAt) return EventStatus.ACTIVE;
  return EventStatus.ENDED;
}

const eventSchema = new Schema<EventDoc>({
  title: { type: String, required: true },
  slug: { type: String, unique: true },
  coverUrl: { type: String },
  description: { type: String, default: '' },
  category: { type: String, enum: Object.values(EventCategory), required: true },
  startAt: { type: Date, required: true },
  endAt: { type: Date, required: true },
  registrationClosesAt: { type: Date, required: true },
  status: { type: String, enum: Object.values(EventStatus), default: EventStatus.UPCOMING },
  capacity: { type: Number, required: true },
  registeredUsers: [{ type: Schema.Types.ObjectId, ref: 'User', default: [] }],
  registeredCount: { type: Number, default: 0 },
  organizerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  location: { type: LocationSchema, required: true },
  isDeleted: { type: Boolean, default: false },
}, { timestamps: true });

eventSchema.pre('validate', async function (next) {
  if (!this.slug && this.title) {
    this.slug = await generateSlug(this.constructor as any, this.title);
  }
  if (this.status !== EventStatus.CANCELLED) {
    this.status = deriveStatus(this);
  }
  next();
});

eventSchema.index({ slug: 1 }, { unique: true });
eventSchema.index({ status: 1, startAt: -1 });
eventSchema.index({ category: 1, startAt: -1 });

export const EventModel = model<EventDoc>('Event', eventSchema);

export default EventModel;
