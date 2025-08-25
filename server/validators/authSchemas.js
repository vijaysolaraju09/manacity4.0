const { z } = require('zod');

const signupSchema = {
  body: z.object({
    name: z.string().min(2, 'Name is required'),
    phone: z.string().regex(/^\+?\d{10,15}$/, 'Invalid phone'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    location: z.string().min(2, 'Location is required'),
    role: z.string().optional(),
  }),
};

const loginSchema = {
  body: z.object({
    phone: z.string().regex(/^\+?\d{10,15}$/, 'Invalid phone'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
  }),
};

const otpSchema = {
  body: z.object({
    phone: z.string().regex(/^\+?\d{10,15}$/, 'Invalid phone'),
    otp: z.string().min(4, 'OTP is required'),
  }),
};

module.exports = { signupSchema, loginSchema, otpSchema };
