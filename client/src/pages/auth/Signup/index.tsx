import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useDispatch } from 'react-redux';
import showToast from '@/components/ui/Toast';
import { AuthButton as Button } from '@/components/ui/AuthButton';
import { LabeledInput as Input } from '@/components/ui/LabeledInput';
import { ErrorAlert } from '@/components/Alerts';
import { createZodResolver } from '@/lib/createZodResolver';
import { toErrorMessage } from '@/lib/response';
import { signup as signupApi } from '@/api/auth';
import { setToken, setUser, type SignupDraft } from '@/store/slices/authSlice';
import logo from '@/assets/logo.png';
import fallbackImage from '@/assets/no-image.svg';
import { paths } from '@/routes/paths';

const signupSchema = z.object({
  name: z
    .string({ required_error: 'Full name is required.' })
    .trim()
    .min(2, 'Name must be at least 2 characters long.')
    .max(80, 'Name must be under 80 characters.'),
  phone: z
    .string({ required_error: 'Phone number is required.' })
    .trim()
    .min(10, 'Enter a valid phone number.')
    .max(14, 'Phone number seems too long.')
    .regex(/^[0-9()+\s-]+$/, 'Only digits and basic separators are allowed.'),
  password: z
    .string({ required_error: 'Create a password to continue.' })
    .min(6, 'Password must be at least 6 characters long.'),
  email: z
    .union([
      z
        .string()
        .trim()
        .email('Enter a valid email address.'),
      z.literal(''),
      z.undefined(),
    ])
    .transform((value) => (value === '' ? undefined : value)),
  location: z
    .union([
      z
        .string()
        .trim()
        .min(2, 'Location must be at least 2 characters long.')
        .max(120, 'Location must be under 120 characters.'),
      z.literal(''),
      z.undefined(),
    ])
    .transform((value) => (value === '' ? undefined : value)),
  role: z.enum(['customer', 'business']).default('customer'),
});

const normalizePhone = (value: string) => value.replace(/\D/g, '');

type SignupForm = z.infer<typeof signupSchema>;

const Signup = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const firstFieldRef = useRef<HTMLInputElement | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignupForm>({
    resolver: createZodResolver(signupSchema),
    mode: 'onSubmit',
    defaultValues: {
      role: 'customer',
    },
  });

  useEffect(() => {
    firstFieldRef.current?.focus();
  }, []);

  const onSubmit = handleSubmit(async ({ name, phone, password, email, location, role }) => {
    setErrorMessage(null);
    try {
      const payload: SignupDraft = {
        name,
        phone: normalizePhone(phone),
        password,
        email,
        location,
        role,
      };

      const response = await signupApi(payload);
      const token = response.token;
      const user = response.user;

      if (!token || !user) {
        throw new Error('Unexpected response from the server.');
      }

      dispatch(setToken(token));
      dispatch(setUser(user));

      showToast('Account created successfully. Welcome to Manacity!', 'success');
      navigate('/', { replace: true });
    } catch (error) {
      const message =
        toErrorMessage(error) || 'We could not create your account. Please try again.';
      setErrorMessage(message);
      showToast(message, 'error');
    }
  });

  const nameField = register('name');
  const phoneField = register('phone');

  const roleOptions = useMemo(
    () => [
      { value: 'customer' as const, label: 'Customer' },
      { value: 'business' as const, label: 'Business' },
    ],
    [],
  );

  const handleLoginRedirect = useCallback(() => {
    navigate(paths.auth.login());
  }, [navigate]);

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-slate-950/70 px-4 py-12">
      <div
        className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=1350&q=80')] bg-cover bg-center opacity-20"
        aria-hidden
      />
      <div className="relative z-10 flex w-full max-w-5xl flex-col gap-10 lg:flex-row">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="hidden w-full max-w-sm flex-col justify-between rounded-3xl bg-slate-900/80 p-10 text-white shadow-2xl backdrop-blur lg:flex"
        >
          <div>
            <img
              src={logo}
              onError={(event) => {
                event.currentTarget.src = fallbackImage;
              }}
              alt="Manacity"
              className="h-12 w-auto"
            />
            <h1 className="mt-10 text-3xl font-bold leading-tight">Your city, curated.</h1>
            <p className="mt-4 text-sm text-slate-200/80">
              Discover hyperlocal experiences, verified services, and trusted shops around you. Join the
              community in just a few steps.
            </p>
          </div>
          <div className="rounded-2xl bg-white/10 p-6 text-sm">
            <p className="font-semibold text-slate-100">Already have an account?</p>
            <p className="mt-1 text-slate-200/80">Sign in to continue where you left off.</p>
            <Button variant="ghost" className="mt-4 text-white hover:text-white" onClick={handleLoginRedirect}>
              Go to login
            </Button>
          </div>
        </motion.div>

        <div className="w-full">
          <motion.form
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="rounded-3xl bg-white/95 p-6 shadow-2xl shadow-slate-900/10 ring-1 ring-slate-200/60 backdrop-blur dark:bg-slate-900/95 dark:ring-slate-700/60"
            noValidate
            onSubmit={onSubmit}
          >
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Create your account</h2>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                  Join Manacity to explore trusted local services, events, and stores curated for you.
                </p>
              </div>
              <img src={logo} alt="Manacity" className="hidden h-10 w-auto sm:block" />
            </div>

            {errorMessage ? <ErrorAlert title="Could not create account" description={errorMessage} /> : null}

            <div className="mt-8 space-y-5">
              <Input
                label="Full name"
                placeholder="Jane Doe"
                {...nameField}
                error={errors.name?.message}
                ref={(node) => {
                  nameField.ref(node);
                  firstFieldRef.current = node;
                }}
              />

              <Input
                label="Phone number"
                placeholder="98765 43210"
                inputMode="tel"
                autoComplete="tel"
                {...phoneField}
                error={errors.phone?.message}
              />

              <Input
                label="Password"
                type="password"
                autoComplete="new-password"
                placeholder="Create a secure password"
                helperText="Minimum 6 characters. Use a mix of letters and numbers for better security."
                {...register('password')}
                error={errors.password?.message}
              />

              <Input
                label="Email (optional)"
                type="email"
                placeholder="jane@example.com"
                autoComplete="email"
                {...register('email')}
                error={errors.email?.message}
              />

              <Input
                label="Location (optional)"
                placeholder="Bengaluru, India"
                {...register('location')}
                error={errors.location?.message}
              />

              <div>
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Account type</p>
                <div className="mt-3 flex flex-wrap gap-3">
                  {roleOptions.map((option) => (
                    <label
                      key={option.value}
                      className="flex cursor-pointer items-center gap-2 rounded-2xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-blue-500 hover:text-blue-600 dark:border-slate-700 dark:text-slate-200"
                    >
                      <input
                        type="radio"
                        value={option.value}
                        className="h-4 w-4 border-slate-300 text-blue-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500"
                        {...register('role')}
                      />
                      {option.label}
                    </label>
                  ))}
                </div>
                {errors.role?.message ? (
                  <p className="mt-2 text-sm text-rose-600" role="alert">
                    {errors.role.message}
                  </p>
                ) : null}
              </div>

              <div className="rounded-2xl bg-blue-50/70 px-5 py-4 text-sm text-blue-900 ring-1 ring-blue-100 dark:bg-blue-500/10 dark:text-blue-100 dark:ring-blue-500/40">
                <p className="font-semibold">Why share your phone number?</p>
                <p className="text-sm opacity-80">
                  It helps us secure your account, send important updates, and support password recovery when needed.
                </p>
              </div>

              <Button type="submit" className="w-full" loading={isSubmitting}>
                Create account
              </Button>

              <p className="text-center text-sm text-slate-600 dark:text-slate-300">
                Already have an account?{' '}
                <button
                  type="button"
                  className="font-semibold text-blue-600 hover:text-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500"
                  onClick={handleLoginRedirect}
                >
                  Sign in here
                </button>
              </p>
            </div>
          </motion.form>
        </div>
      </div>
    </div>
  );
};

export default Signup;
