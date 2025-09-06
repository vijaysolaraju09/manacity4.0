const { z } = require('zod');

const phoneSchema = z.string().regex(/^\+?\d{10,15}$/, 'Invalid phone');

const signupSchema = {
  body: z
    .object({
      name: z.string().min(2, 'Name is required'),
      phone: phoneSchema.optional(),
      email: z.string().email('Invalid email').optional(),
      password: z.string().min(6, 'Password must be at least 6 characters'),
      location: z.string().min(2, 'Location is required'),
      role: z.string().optional(),
    })
    .refine((data) => data.phone || data.email, {
      message: 'Phone or email is required',
      path: ['phone'],
    }),
};

const loginSchema = {
  body: z
    .object({
      phone: phoneSchema.optional(),
      email: z.string().email('Invalid email').optional(),
      password: z.string().min(6, 'Password must be at least 6 characters'),
    })
    .refine((data) => data.phone || data.email, {
      message: 'Phone or email is required',
      path: ['phone'],
    }),
};

module.exports = { signupSchema, loginSchema };
