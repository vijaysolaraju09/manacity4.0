import { z } from 'zod';

export const phoneE164 = z
  .string()
  .regex(/^\+[1-9]\d{7,14}$/, 'Enter a valid international phone number including country code.');

export const emailSchema = z
  .string({ required_error: 'Email is required.' })
  .trim()
  .toLowerCase()
  .email('Please provide a valid email address.');

export const optionalEmailSchema = z
  .union([
    z
      .string()
      .trim()
      .toLowerCase()
      .email('Please provide a valid email address.'),
    z.literal(''),
  ])
  .transform((value) => (value === '' ? undefined : value));

export const passwordSchema = z
  .string({ required_error: 'Password is required.' })
  .min(8, 'Password must be at least 8 characters long.')
  .regex(/[a-z]/, 'Include at least one lowercase letter.')
  .regex(/[A-Z]/, 'Include at least one uppercase letter.')
  .regex(/\d/, 'Include at least one number.')
  .regex(/[!@#$%^&*(),.?":{}|<>\-_=+\[\]\\/]/, 'Include at least one special character.');

export const optionalPasswordSchema = z
  .union([passwordSchema, z.literal('')])
  .transform((value) => (value === '' ? undefined : value));

export const signupSchema = z.object({
  name: z
    .string({ required_error: 'Name is required.' })
    .trim()
    .min(2, 'Name must be at least 2 characters long.')
    .max(80, 'Name must be under 80 characters.'),
  email: optionalEmailSchema,
  password: optionalPasswordSchema,
  country: z.string({ required_error: 'Select your country.' }).min(2, 'Select your country.'),
  phone: z
    .string({ required_error: 'Phone number is required.' })
    .trim()
    .min(5, 'Enter your phone number.')
    .max(20, 'Phone number seems too long.')
    .regex(/^[0-9()\s+-]+$/, 'Only digits, spaces, and basic separators are allowed.'),
}).superRefine((data, ctx) => {
  if (data.email && !data.password) {
    ctx.addIssue({
      path: ['password'],
      code: z.ZodIssueCode.custom,
      message: 'Password is required when email is provided.',
    });
  }

  if (!data.email && data.password) {
    ctx.addIssue({
      path: ['email'],
      code: z.ZodIssueCode.custom,
      message: 'Email is required when providing a password.',
    });
  }
});

export type SignupSchema = z.infer<typeof signupSchema>;
