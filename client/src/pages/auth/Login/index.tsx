import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
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
import { login as loginApi } from '@/api/auth';
import { setToken, setUser } from '@/store/slices/authSlice';
import logo from '@/assets/logo.png';
import fallbackImage from '@/assets/no-image.svg';
import { paths } from '@/routes/paths';

const loginSchema = z.object({
  phone: z
    .string({ required_error: 'Phone number is required.' })
    .trim()
    .min(10, 'Enter a valid phone number.')
    .max(14, 'Phone number seems too long.')
    .regex(/^[0-9()+\s-]+$/, 'Only digits and basic separators are allowed.'),
  password: z
    .string({ required_error: 'Password is required.' })
    .min(6, 'Password must be at least 6 characters long.'),
  remember: z.boolean().default(false),
});

type LoginSchema = z.infer<typeof loginSchema>;

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const phoneRef = useRef<HTMLInputElement | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const rememberedPhone = useMemo(() => {
    if (typeof window === 'undefined') return '';
    return window.localStorage.getItem('manacity:remembered-phone') ?? '';
  }, []);

  const rememberedFlag = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem('manacity:remembered-flag') === 'true';
  }, []);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginSchema>({
    resolver: createZodResolver(loginSchema),
    mode: 'onSubmit',
    defaultValues: {
      phone: rememberedPhone,
      remember: rememberedFlag,
    },
  });

  useEffect(() => {
    phoneRef.current?.focus();
  }, []);

  const normalizePhone = useCallback((value: string) => value.replace(/\D/g, ''), []);

  const onSubmit = handleSubmit(async ({ phone, password, remember }) => {
    setErrorMessage(null);
    try {
      const normalizedPhone = normalizePhone(phone);
      const result = await loginApi({ phone: normalizedPhone, password });
      dispatch(setToken(result.token));
      dispatch(setUser(result.user));

      if (typeof window !== 'undefined') {
        if (remember) {
          window.localStorage.setItem('manacity:remembered-phone', phone);
          window.localStorage.setItem('manacity:remembered-flag', 'true');
        } else {
          window.localStorage.removeItem('manacity:remembered-phone');
          window.localStorage.removeItem('manacity:remembered-flag');
        }
      }

      const redirectState = location.state as { from?: { pathname?: string } } | undefined;
      const destination = redirectState?.from?.pathname ?? '/';
      showToast('Welcome back!', 'success');
      navigate(destination, { replace: true });
    } catch (error) {
      const message =
        toErrorMessage(error) || 'Unable to sign in with those credentials. Please try again.';
      setErrorMessage(message);
      showToast(message, 'error');
    }
  });

  const phoneField = register('phone');
  const passwordField = register('password');
  const rememberField = register('remember');

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950/80 px-4 py-12">
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-950 to-blue-900 opacity-80" aria-hidden />
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="relative z-10 grid w-full max-w-4xl gap-10 rounded-3xl bg-white/95 p-10 shadow-2xl shadow-blue-900/30 ring-1 ring-slate-200/70 backdrop-blur dark:bg-slate-900/95 dark:ring-slate-700/60 lg:grid-cols-[1.1fr_0.9fr]"
      >
        <div className="flex flex-col justify-between rounded-2xl bg-slate-900/90 p-8 text-white">
          <div>
            <img
              src={logo}
              alt="Manacity"
              className="h-10 w-auto"
              onError={(event) => {
                event.currentTarget.src = fallbackImage;
              }}
            />
            <h1 className="mt-10 text-3xl font-bold leading-tight">Welcome back.</h1>
            <p className="mt-4 text-sm text-slate-200/80">
              Pick up where you left off. Track orders, manage services, and explore what’s new in your neighbourhood.
            </p>
          </div>
          <div className="rounded-2xl bg-white/10 p-6 text-sm">
            <p className="font-semibold text-slate-100">New to Manacity?</p>
            <p className="mt-2 text-slate-200/80">
              Verify your phone in minutes, set a password, and unlock exclusive local experiences tailored to you.
            </p>
            <Button
              variant="ghost"
              className="mt-4 text-white hover:text-white"
              onClick={() => navigate(paths.auth.signup())}
            >
              Create an account
            </Button>
          </div>
        </div>

        <div className="flex flex-col justify-center">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Sign in to your account</h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            Enter your credentials to continue to your personalised dashboard.
          </p>

          <form onSubmit={onSubmit} noValidate className="mt-6 space-y-6">
            {errorMessage ? <ErrorAlert title="Sign-in failed" description={errorMessage} /> : null}

            <Input
              label="Phone number"
              type="tel"
              placeholder="9876543210"
              autoComplete="tel"
              {...phoneField}
              error={errors.phone?.message}
              ref={(node) => {
                phoneField.ref(node);
                phoneRef.current = node;
              }}
            />

            <Input
              label="Password"
              type="password"
              autoComplete="current-password"
              placeholder="Enter your password"
              {...passwordField}
              error={errors.password?.message}
            />

            <div className="flex items-center justify-between text-sm text-slate-600 dark:text-slate-300">
              <label className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500"
                  {...rememberField}
                />
                <span>Remember me on this device</span>
              </label>
              <button
                type="button"
                className="font-semibold text-blue-600 hover:text-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500"
                onClick={() => navigate('/auth/forgot')}
              >
                Forgot password?
              </button>
            </div>

            <Button type="submit" className="w-full" loading={isSubmitting}>
              Sign in
            </Button>
          </form>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;
