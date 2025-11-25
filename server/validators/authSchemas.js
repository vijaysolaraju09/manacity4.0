const { z } = require('zod');

const phoneSchema = z.string().regex(/^\+?\d{10,14}$/, 'Invalid phone');

// Keep server-side validation aligned with the controller requirements (>= 6 chars)
// to avoid rejecting valid signups after OTP verification.
const passwordSchema = z.string().min(6, 'Password must be at least 6 characters');

const signupSchema = {
  body: z.object({
    name: z.string().min(2).max(80),
    phone: phoneSchema,
    password: passwordSchema,
    location: z
      .string()
      .min(2, 'Location must be at least 2 characters')
      .optional()
      .or(z.literal('')),
    role: z.enum(['customer', 'business']).optional(),
    email: z.string().email().optional().or(z.literal('')),
  }),
};

const loginSchema = {
  body: z.object({
    phone: phoneSchema,
    // Login should accept any existing password hash (including legacy weak ones),
    // so only require a non-empty string here.
    password: z.string().min(1, 'Password is required'),
  }),
};

const forgotPasswordSchema = {
  body: z.object({
    phone: phoneSchema,
  }),
};

const resetPasswordSchema = {
  body: z.object({
    phone: phoneSchema,
    password: passwordSchema,
  }),
};

module.exports = {
  signupSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
};
