const { Schema, model } = require('mongoose');
const { FIELD_TYPES, sanitizeHtml, sanitizeId } = require('../utils/dynamicForm');

const EVENT_TYPES = ['tournament', 'activity'];
const EVENT_CATEGORIES = [
  'freefire',
  'pubg',
  'quiz',
  'cricket',
  'volleyball',
  'campfire',
  'movie',
  'foodfest',
  'other',
];
const EVENT_FORMATS = [
  'single_elim',
  'double_elim',
  'round_robin',
  'points',
  'single_match',
  'custom',
];
const EVENT_VISIBILITY = ['public', 'private'];
const EVENT_STATUSES = ['draft', 'published', 'ongoing', 'completed', 'canceled'];
const EVENT_MODES = ['online', 'venue'];

const geoSchema = new Schema(
  {
    lat: Number,
    lng: Number,
  },
  { _id: false }
);

const formFieldSchema = new Schema(
  {
    id: {
      type: String,
      required: true,
      trim: true,
      set: (value) => sanitizeId(value),
    },
    label: {
      type: String,
      required: true,
      trim: true,
      set: (value) => sanitizeHtml(value),
    },
    type: {
      type: String,
      enum: FIELD_TYPES,
      required: true,
    },
    required: { type: Boolean, default: false },
    placeholder: {
      type: String,
      default: '',
      set: (value) => sanitizeHtml(value),
    },
    help: {
      type: String,
      default: '',
      set: (value) => sanitizeHtml(value),
    },
    options: {
      type: [String],
      default: [],
      set: (values) =>
        Array.isArray(values)
          ? values
              .map((value) => sanitizeHtml(value))
              .filter((value) => value.length > 0)
          : [],
    },
    min: { type: Number },
    max: { type: Number },
    pattern: { type: String },
    defaultValue: { type: Schema.Types.Mixed },
  },
  { _id: false }
);

const dynamicFormSchema = new Schema(
  {
    mode: {
      type: String,
      enum: ['embedded', 'template'],
      default: 'embedded',
    },
    templateId: { type: Schema.Types.ObjectId, ref: 'FormTemplate', default: null },
    fields: { type: [formFieldSchema], default: [] },
    isActive: { type: Boolean, default: false },
  },
  { _id: false }
);

const sanitizeStringArray = (values = []) =>
  Array.isArray(values)
    ? values
        .map((value) => sanitizeHtml(String(value ?? '')))
        .map((value) => value.trim())
        .filter((value) => value.length > 0)
    : [];

const contactSchema = new Schema(
  {
    name: { type: String, set: (value) => sanitizeHtml(value) },
    phone: { type: String, set: (value) => sanitizeHtml(value) },
    email: { type: String, set: (value) => sanitizeHtml(value) },
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
      maxlength: 160,
    },
    type: {
      type: String,
      enum: EVENT_TYPES,
      required: true,
    },
    category: {
      type: String,
      enum: EVENT_CATEGORIES,
      default: 'other',
    },
    format: {
      type: String,
      enum: EVENT_FORMATS,
      default: 'single_match',
    },
    teamSize: { type: Number, default: 1, min: 1 },
    maxParticipants: { type: Number, required: true, min: 1 },
    registrationOpenAt: { type: Date, required: true },
    registrationCloseAt: { type: Date, required: true },
    regOpenAt: { type: Date },
    regCloseAt: { type: Date },
    startAt: { type: Date, required: true },
    endAt: { type: Date },
    timezone: { type: String, default: 'Asia/Kolkata' },
    mode: { type: String, enum: EVENT_MODES, default: 'online' },
    venue: { type: String },
    geo: { type: geoSchema },
    visibility: {
      type: String,
      enum: EVENT_VISIBILITY,
      default: 'public',
    },
    status: {
      type: String,
      enum: EVENT_STATUSES,
      default: 'draft',
    },
    description: { type: String, default: '', maxlength: 12000 },
    rules: { type: String, default: '', maxlength: 12000 },
    prizePool: { type: String },
    entryFeePaise: { type: Number, default: 0, min: 0 },
    shortDescription: {
      type: String,
      default: '',
      maxlength: 500,
      set: (value) => sanitizeHtml(value),
    },
    highlightLabel: {
      type: String,
      default: '',
      maxlength: 120,
      set: (value) => sanitizeHtml(value),
    },
    accentColor: {
      type: String,
      default: '',
      set: (value) => sanitizeHtml(value),
    },
    iconUrl: {
      type: String,
      default: '',
      set: (value) => sanitizeHtml(value),
    },
    featured: { type: Boolean, default: false },
    bannerUrl: { type: String },
    coverUrl: { type: String },
    livestreamUrl: {
      type: String,
      default: '',
      set: (value) => sanitizeHtml(value),
    },
    venueMapUrl: {
      type: String,
      default: '',
      set: (value) => sanitizeHtml(value),
    },
    structure: {
      type: String,
      default: '',
      set: (value) => sanitizeHtml(value),
    },
    rewards: {
      type: [String],
      default: [],
      set: (values) => sanitizeStringArray(values),
    },
    registrationChecklist: {
      type: [String],
      default: [],
      set: (values) => sanitizeStringArray(values),
    },
    contact: { type: contactSchema, default: undefined },
    registeredCount: { type: Number, default: 0, min: 0 },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    updatesCount: { type: Number, default: 0 },
    leaderboardVersion: { type: Number, default: 0 },
    dynamicForm: {
      type: dynamicFormSchema,
      default: () => ({
        mode: 'embedded',
        templateId: null,
        fields: [],
        isActive: false,
      }),
    },
  },
  { timestamps: true }
);

eventSchema.index({ status: 1, category: 1, startAt: -1 });
eventSchema.index({ type: 1, startAt: -1 });
eventSchema.index({ createdBy: 1, startAt: -1 });
eventSchema.index({ registrationCloseAt: 1 });
eventSchema.index({ 'dynamicForm.templateId': 1 });
try {
  eventSchema.index({
    title: 'text',
    description: 'text',
    rules: 'text',
  });
} catch (err) {
  // ignore text index recreation errors in tests
}

eventSchema.pre('save', function clampRegisteredCount(next) {
  if (typeof this.maxParticipants === 'number' && this.registeredCount > this.maxParticipants) {
    this.registeredCount = this.maxParticipants;
  }
  next();
});

eventSchema.pre('validate', function syncRegistrationWindows(next) {
  if (!this.regOpenAt && this.registrationOpenAt) {
    this.regOpenAt = this.registrationOpenAt;
  }
  if (!this.registrationOpenAt && this.regOpenAt) {
    this.registrationOpenAt = this.regOpenAt;
  }
  if (!this.regCloseAt && this.registrationCloseAt) {
    this.regCloseAt = this.registrationCloseAt;
  }
  if (!this.registrationCloseAt && this.regCloseAt) {
    this.registrationCloseAt = this.regCloseAt;
  }
  next();
});

eventSchema.methods.toCardJSON = function toCardJSON() {
  return {
    id: this._id.toString(),
    _id: this._id,
    title: this.title,
    type: this.type,
    category: this.category,
    format: this.format,
    teamSize: this.teamSize,
    maxParticipants: this.maxParticipants,
    registeredCount: this.registeredCount,
    registrationOpenAt: this.registrationOpenAt,
    registrationCloseAt: this.registrationCloseAt,
    regOpenAt: this.regOpenAt || this.registrationOpenAt,
    regCloseAt: this.regCloseAt || this.registrationCloseAt,
    startAt: this.startAt,
    endAt: this.endAt,
    status: this.status,
    mode: this.mode,
    venue: this.venue,
    visibility: this.visibility,
    bannerUrl: this.bannerUrl || null,
    prizePool: this.prizePool || null,
    shortDescription: this.shortDescription || null,
    highlightLabel: this.highlightLabel || null,
    accentColor: this.accentColor || null,
    iconUrl: this.iconUrl || null,
    featured: Boolean(this.featured),
    entryFeePaise:
      typeof this.entryFeePaise === 'number' && Number.isFinite(this.entryFeePaise)
        ? this.entryFeePaise
        : 0,
  };
};

eventSchema.methods.toDetailJSON = function toDetailJSON() {
  const base = this.toCardJSON();
  return {
    ...base,
    timezone: this.timezone,
    description: this.description,
    rules: this.rules,
    prizePool: this.prizePool,
    entryFeePaise:
      typeof this.entryFeePaise === 'number' && Number.isFinite(this.entryFeePaise)
        ? this.entryFeePaise
        : 0,
    coverUrl: this.coverUrl || null,
    updatesCount: this.updatesCount,
    leaderboardVersion: this.leaderboardVersion,
    livestreamUrl: this.livestreamUrl || null,
    venueMapUrl: this.venueMapUrl || null,
    structure: this.structure || null,
    rewards: Array.isArray(this.rewards) ? this.rewards : [],
    registrationChecklist: Array.isArray(this.registrationChecklist)
      ? this.registrationChecklist
      : [],
    contact: this.contact || null,
  };
};

module.exports = model('Event', eventSchema);
