const { z } = require('zod');

const isoDate = z.string().refine((val) => !isNaN(Date.parse(val)), {
  message: 'Invalid date',
});

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
const EVENT_MODES = ['online', 'venue'];

const positiveInt = z.number().int().positive();
const nonNegativeInt = z.number().int().nonnegative();

const optionalEnum = (values) => z.enum(values).optional();

const optionalString = (max) => z.string().trim().max(max).optional();

const createEventSchema = {
  body: z
    .object({
      title: z.string().trim().min(1).max(160),
      type: optionalEnum(EVENT_TYPES),
      category: optionalEnum(EVENT_CATEGORIES),
      format: optionalEnum(EVENT_FORMATS),
      startAt: isoDate,
      endAt: isoDate,
      registrationOpenAt: isoDate.optional(),
      registrationCloseAt: isoDate.optional(),
      teamSize: positiveInt.optional(),
      capacity: nonNegativeInt,
      maxParticipants: nonNegativeInt.optional(),
      timezone: optionalString(120),
      mode: optionalEnum(EVENT_MODES),
      venue: z.string().trim().max(400).optional().or(z.literal(null)),
      visibility: optionalEnum(EVENT_VISIBILITY),
      description: optionalString(12000),
      rules: optionalString(12000),
      prizePool: optionalString(400),
      entryFeePaise: nonNegativeInt.optional(),
      bannerUrl: optionalString(2048),
      coverUrl: optionalString(2048),
      templateId: z
        .string()
        .trim()
        .regex(/^[a-fA-F0-9]{24}$/u, 'Invalid template id')
        .optional(),
    })
    .refine((data) => new Date(data.startAt) < new Date(data.endAt), {
      message: 'startAt must be before endAt',
      path: ['endAt'],
    }),
};

const updateEventSchema = {
  body: z
    .object({
      title: z.string().trim().min(1).max(160).optional(),
      type: optionalEnum(EVENT_TYPES),
      category: optionalEnum(EVENT_CATEGORIES),
      format: optionalEnum(EVENT_FORMATS),
      startAt: isoDate.optional(),
      endAt: isoDate.optional(),
      registrationOpenAt: isoDate.optional(),
      registrationCloseAt: isoDate.optional(),
      teamSize: positiveInt.optional(),
      capacity: nonNegativeInt.optional(),
      maxParticipants: nonNegativeInt.optional(),
      timezone: optionalString(120),
      mode: optionalEnum(EVENT_MODES),
      venue: z.string().trim().max(400).optional().or(z.literal(null)),
      visibility: optionalEnum(EVENT_VISIBILITY),
      description: optionalString(12000),
      rules: optionalString(12000),
      prizePool: optionalString(400),
      entryFeePaise: nonNegativeInt.optional(),
      bannerUrl: optionalString(2048),
      coverUrl: optionalString(2048),
    })
    .refine(
      (data) =>
        !(data.startAt && data.endAt) ||
        new Date(data.startAt) < new Date(data.endAt),
      { message: 'startAt must be before endAt', path: ['endAt'] }
    ),
};

module.exports = { createEventSchema, updateEventSchema };
