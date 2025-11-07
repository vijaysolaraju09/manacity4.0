import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import Loader from '@/components/Loader';
import showToast from '@/components/ui/Toast';
import { AuthCard, AuthShell, Button, Card, Input, cn } from '@/components/auth/AuthShell';
import { paths } from '@/routes/paths';
import { normalizePhoneDigits } from '@/utils/phone';
import { createZodResolver } from '@/lib/createZodResolver';
import { useForm } from '@/components/ui/form';
import * as z from 'zod';
import OTPPhoneFirebase from '@/components/forms/OTPPhoneFirebase';
import { useDispatch } from 'react-redux';
import { setToken, setUser } from '@/store/slices/authSlice';
import type { AppDispatch } from '@/store';
import { signup as signupApi } from '@/api/auth';
import { toErrorMessage } from '@/lib/response';

const SignupSchema = z.object({
  name: z.string().min(5, 'Name must be at least 5 characters long'),
  phone: z.string().regex(/^\d{10}$/, 'Phone number must be 10 digits'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  location: z.string().min(1, 'Location is required'),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
});

const defaultCountryCode = '+91';

type SignupFormValues = z.infer<typeof SignupSchema>;

const Signup = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const [showPassword, setShowPassword] = useState(false);
  const [otpStep, setOtpStep] = useState(false);
  const [signupData, setSignupData] = useState<SignupFormValues | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isValid, isSubmitting },
  } = useForm<SignupFormValues>({
    resolver: createZodResolver(SignupSchema),
    mode: 'onChange',
  });

  const onSubmit = (data: SignupFormValues) => {
    const normalizedPhone = normalizePhoneDigits(data.phone);
    if (!normalizedPhone) {
      setOtpStep(false);
      showToast('Enter a valid phone number.', 'error');
      return;
    }

    setSignupData({ ...data, phone: normalizedPhone });
    setOtpStep(true);
  };

  const handleOtpVerified = async () => {
    if (!signupData) {
      return;
    }

    try {
      const result = await signupApi(signupData);

      if (result?.token && result?.user) {
        dispatch(setToken(result.token));
        dispatch(setUser(result.user));
        showToast('Signup successful!', 'success');
        navigate(paths.home());
        return;
      }

      const message = result?.message || 'Phone verified. You can now log in with your password.';
      showToast(message, 'success');
      navigate(paths.auth.login());
    } catch (error) {
      const message = toErrorMessage(error) || 'Signup failed. Please try again.';
      showToast(message, 'error');
      setOtpStep(false);
    }
  };

  return (
    <AuthShell>
      <div className="mx-auto max-w-3xl space-y-6">
        <Card className="relative hidden overflow-hidden p-6 md:block md:p-8">
          <div className="absolute inset-0 bg-gradient-to-br from-[var(--primary)]/15 via-transparent to-[var(--accent)]/20" />
          <div className="relative space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full bg-[var(--surface-0)] px-3 py-1 text-xs text-[var(--text-muted)]">
              <span>Join the community</span>
              <span>•</span>
              <span>Access exclusive offers</span>
            </div>
            <h1 className="text-3xl font-bold leading-tight md:text-4xl">Create your Manacity account</h1>
            <p className="max-w-prose text-[var(--text-muted)]">
              Sign up to discover shops, events, and verified services nearby.
            </p>
          </div>
        </Card>

        {!otpStep && (
          <AuthCard title="Create your account" subtitle="It only takes a minute">
            <form className="grid gap-3" onSubmit={handleSubmit(onSubmit)} noValidate>
              <Input
                label="Full name"
                placeholder="Your name"
                {...register('name')}
                error={errors.name?.message}
              />

              <Input
                label="Phone number"
                placeholder="Enter phone number"
                inputMode="tel"
                pattern="\d{10}"
                autoComplete="tel"
                {...register('phone')}
                error={errors.phone?.message}
              />

              <Input
                label="Email (optional)"
                type="email"
                placeholder="you@manacity.app"
                {...register('email')}
                error={errors.email?.message}
              />

              <div className="text-sm">
                <div className="mb-1 text-[var(--text-muted)]">Password</div>
                <div className="relative flex items-center">
                  <input
                    id="signup-password"
                    type={showPassword ? 'text' : 'password'}
                    {...register('password')}
                    className={cn(
                      'focus-ring w-full rounded-xl border border-[var(--border)] bg-[var(--surface-0)] px-3 py-2 pr-10 text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]/70',
                      errors.password && 'border-red-400 text-red-500 placeholder:text-red-300',
                    )}
                  />
                  <button
                    type="button"
                    className="absolute right-3 text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    onClick={() => setShowPassword((prev) => !prev)}
                  >
                    {showPassword ? <EyeOff aria-hidden="true" className="h-4 w-4" /> : <Eye aria-hidden="true" className="h-4 w-4" />}
                  </button>
                </div>
                {errors.password && <div className="mt-1 text-xs text-red-500">{errors.password.message}</div>}
              </div>

              <label className="text-sm">
                <div className="mb-1 text-[var(--text-muted)]">Location</div>
                <select
                  id="signup-location"
                  {...register('location')}
                  className={cn(
                    'focus-ring w-full rounded-xl border border-[var(--border)] bg-[var(--surface-0)] px-3 py-2 text-[var(--text-primary)] outline-none',
                    errors.location && 'border-red-400 text-red-500',
                  )}
                >
                  <option value="">Select Area</option>
                  <option value="Town Center">Town Center</option>
                  <option value="Main Road">Main Road</option>
                  <option value="North Market">North Market</option>
                  <option value="Old Street">Old Street</option>
                </select>
                {errors.location && <div className="mt-1 text-xs text-red-500">{errors.location.message}</div>}
              </label>

              <Button type="submit" className="mt-1 w-full" disabled={!isValid || isSubmitting}>
                {isSubmitting ? <Loader /> : 'Continue'}
              </Button>

              <div className="text-center text-sm text-[var(--text-muted)]">
                <button
                  type="button"
                  className="underline transition-colors hover:text-[var(--text-primary)]"
                  onClick={() => navigate(paths.auth.login())}
                >
                  Already have an account?
                </button>
              </div>
              <div className="text-center text-sm text-[var(--text-muted)]">
                <button
                  type="button"
                  className="underline transition-colors hover:text-[var(--text-primary)]"
                  onClick={() => navigate(paths.landing())}
                >
                  Back to landing
                </button>
              </div>
            </form>
          </AuthCard>
        )}

        {otpStep && signupData && (
          <AuthCard
            title="Verify your phone"
            subtitle={`Enter the OTP sent via SMS to confirm your account. Code sent to ••••••${signupData.phone.slice(-4)}`}
          >
            <div className="space-y-4">
              <OTPPhoneFirebase phone={`${defaultCountryCode}${signupData.phone}`} onVerifySuccess={handleOtpVerified} />
              <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-[var(--text-muted)]">
                <button
                  type="button"
                  className="underline transition-colors hover:text-[var(--text-primary)]"
                  onClick={() => setOtpStep(false)}
                >
                  Use a different number
                </button>
                <button
                  type="button"
                  className="underline transition-colors hover:text-[var(--text-primary)]"
                  onClick={() => navigate(paths.auth.login())}
                >
                  Back to login
                </button>
              </div>
            </div>
          </AuthCard>
        )}
      </div>
    </AuthShell>
  );
};

export default Signup;
