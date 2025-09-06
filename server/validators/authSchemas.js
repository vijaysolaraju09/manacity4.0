const { z } = require('zod');

const phoneSchema = z.string().regex(/^\+?\d{10,15}$/, 'Invalid phone');

const signupSchema = {
  body: z
    .object({
      name: z.string().min(2, 'Name is required'),
      phone: phoneSchema,
      password: z.string().min(6, 'Password must be at least 6 characters'),
      location: z.string().min(2, 'Location is required'),
      role: z.string().optional(),
    }),
};

const loginSchema = {
  body: z.object({
    phone: phoneSchema,
    password: z.string().min(6, 'Password must be at least 6 characters'),
  }),
};

module.exports = { signupSchema, loginSchema };
