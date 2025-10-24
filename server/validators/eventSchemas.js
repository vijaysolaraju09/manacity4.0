const { z } = require('zod');

const isoDate = z.string().refine((val) => !isNaN(Date.parse(val)), {
  message: 'Invalid date',
});

const createEventSchema = {
  body: z
    .object({
      title: z.string().min(1),
      startAt: isoDate,
      endAt: isoDate,
      capacity: z.number().int().nonnegative(),
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
      title: z.string().min(1).optional(),
      startAt: isoDate.optional(),
      endAt: isoDate.optional(),
      capacity: z.number().int().nonnegative().optional(),
    })
    .refine(
      (data) =>
        !(data.startAt && data.endAt) ||
        new Date(data.startAt) < new Date(data.endAt),
      { message: 'startAt must be before endAt', path: ['endAt'] }
    ),
};

module.exports = { createEventSchema, updateEventSchema };
