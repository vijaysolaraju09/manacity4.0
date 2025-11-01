const { z } = require('zod');

const phoneSchema = z.string().regex(/^\d{10,14}$/, 'Invalid phone');

const signupSchema = {
  body: z.object({
    name: z.string().min(2).max(80),
    phone: phoneSchema,
    password: z.string().min(6, 'Password must be at least 6 characters'),
    location: z.string().min(2).optional(),
    role: z.enum(['customer', 'business']).optional(),
    email: z.string().email().optional().or(z.literal('')),
    firebaseIdToken: z.string().min(10, 'Firebase verification token is required'),
  }),
};

const loginSchema = {
  body: z.object({
    phone: phoneSchema,
    password: z.string().min(6, 'Password must be at least 6 characters'),
  }),
};

const forgotPasswordSchema = {
  body: z.object({
    phone: phoneSchema,
  }),
};

const verifyPhoneSchema = {
  body: z.object({
    phone: phoneSchema,
    firebaseIdToken: z.string().min(10, 'Firebase verification token is required'),
  }),
};

const resetPasswordSchema = {
  body: z.object({
    phone: phoneSchema,
    password: z.string().min(6, 'Password must be at least 6 characters'),
    firebaseIdToken: z.string().min(10, 'Firebase verification token is required'),
  }),
};

module.exports = {
  signupSchema,
  loginSchema,
  forgotPasswordSchema,
  verifyPhoneSchema,
  resetPasswordSchema,
};
