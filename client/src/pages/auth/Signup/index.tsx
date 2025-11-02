import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { PhoneAuthProvider } from 'firebase/auth';
import showToast from '@/components/ui/Toast';
import { AuthButton as Button } from '@/components/ui/AuthButton';
import { LabeledInput as Input } from '@/components/ui/LabeledInput';
import { Spinner } from '@/components/ui/Spinner';
import { ErrorAlert, SuccessAlert } from '@/components/Alerts';
import { createZodResolver } from '@/lib/createZodResolver';
import { useCountdown } from '@/hooks/useCountdown';
import { sendOtp, confirmOtp } from '@/firebase/otp';
import { useAuth } from '@/auth/AuthProvider';
import { signupSchema, phoneE164, type SignupSchema } from '@/utils/validation';
import { auth } from '@/firebase/init';
import { paths } from '@/routes/paths';
import logo from '@/assets/logo.png';
import fallbackImage from '@/assets/no-image.svg';

const OTP_LENGTH = 6;
const RESEND_AFTER_SECONDS = 45;

const otpSchema = z.object({
  code: z
    .string({ required_error: 'Enter the verification code.' })
    .trim()
    .length(OTP_LENGTH, `OTP must be ${OTP_LENGTH} digits.`)
    .regex(/^\d+$/, 'OTP should contain digits only.'),
});

type OtpSchema = z.infer<typeof otpSchema>;

type Step = 'form' | 'otp' | 'success';

type CountryOption = {
  code: string;
  dialCode: string;
  label: string;
};

const COUNTRY_OPTIONS: CountryOption[] = [
  { code: 'IN', dialCode: '+91', label: 'India (+91)' },
  { code: 'US', dialCode: '+1', label: 'United States (+1)' },
  { code: 'GB', dialCode: '+44', label: 'United Kingdom (+44)' },
  { code: 'AE', dialCode: '+971', label: 'United Arab Emirates (+971)' },
  { code: 'SG', dialCode: '+65', label: 'Singapore (+65)' },
  { code: 'AU', dialCode: '+61', label: 'Australia (+61)' },
];

const DEFAULT_COUNTRY = (import.meta.env.VITE_DEFAULT_COUNTRY as string | undefined)?.toUpperCase() ?? 'IN';

const motionVariants = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -16 },
};

const mapFirebaseError = (error: unknown): string => {
  const code = (error as { code?: string })?.code ?? 'auth/unknown-error';
  switch (code) {
    case 'auth/invalid-phone-number':
      return 'Please enter a valid phone number including the country code.';
    case 'auth/missing-phone-number':
      return 'Phone number is required to continue.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Please wait a moment before trying again.';
    case 'auth/code-expired':
      return 'The code expired. Request a new OTP to continue.';
    case 'auth/invalid-verification-code':
      return 'That code did not match. Double-check and try again.';
    case 'auth/credential-already-in-use':
      return 'This phone number is already linked to another account.';
    case 'auth/email-already-in-use':
      return 'This email address is already registered. Try logging in instead.';
    default:
      return 'We could not complete the request. Please try again.';
  }
};

const normalizeDigits = (value: string) => value.replace(/[^\d]/g, '');

const resolveCountry = (code: string): CountryOption => {
  return COUNTRY_OPTIONS.find((country) => country.code === code) ?? COUNTRY_OPTIONS[0];
};

const Signup = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const firstFieldRef = useRef<HTMLInputElement | null>(null);
  const otpFieldRef = useRef<HTMLInputElement | null>(null);

  const [step, setStep] = useState<Step>('form');
  const [isSending, setIsSending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [verificationId, setVerificationId] = useState<string | null>(null);
  const [verifiedPhone, setVerifiedPhone] = useState<string | null>(null);

  const countdown = useCountdown(RESEND_AFTER_SECONDS);

  const { signUpWithEmailPasswordAndLinkPhone } = useAuth();

  const {
    register,
    handleSubmit,
    formState: { errors, isValid, isSubmitting },
    setError,
    getValues,
    watch,
  } = useForm<SignupSchema>({
    resolver: createZodResolver(signupSchema),
    mode: 'onChange',
    defaultValues: {
      country: resolveCountry(DEFAULT_COUNTRY).code,
    },
  });

  const {
    register: registerOtp,
    handleSubmit: handleSubmitOtp,
    reset: resetOtp,
    formState: { errors: otpErrors },
  } = useForm<OtpSchema>({
    resolver: createZodResolver(otpSchema),
    mode: 'onSubmit',
  });

  const selectedCountry = watch('country');
  const selectedCountryOption = useMemo(() => resolveCountry(selectedCountry), [selectedCountry]);

  useEffect(() => {
    if (step === 'form' && firstFieldRef.current) {
      firstFieldRef.current.focus();
    }
    if (step === 'otp' && otpFieldRef.current) {
      otpFieldRef.current.focus();
    }
  }, [step]);

  const buildE164 = useCallback(
    (country: CountryOption, phone: string) => {
      const sanitizedDial = normalizeDigits(country.dialCode);
      let digits = normalizeDigits(phone);
      let includesExplicitPrefix = false;

      if (digits.startsWith('00')) {
        digits = digits.slice(2);
        includesExplicitPrefix = true;
      }

      if (phone.trim().startsWith('+')) {
        includesExplicitPrefix = true;
      }

      if (includesExplicitPrefix && digits.startsWith(sanitizedDial)) {
        digits = digits.slice(sanitizedDial.length);
      }

      digits = digits.replace(/^0+/, '');

      return `+${sanitizedDial}${digits}`;
    },
    [],
  );

  const handleSendOtp = handleSubmit(async (values) => {
    setErrorMessage(null);
    const country = resolveCountry(values.country);
    const e164 = buildE164(country, values.phone);
    const parsed = phoneE164.safeParse(e164);

    if (!parsed.success) {
      setError('phone', { message: parsed.error.errors[0]?.message ?? 'Invalid phone number.' });
      return;
    }

    setIsSending(true);
    try {
      const confirmation = await sendOtp(parsed.data);
      setVerificationId(confirmation.verificationId);
      setVerifiedPhone(parsed.data);
      countdown.start();
      setStatusMessage(`We sent a code to ${parsed.data}. It may take a few seconds to arrive.`);
      setStep('otp');
      showToast('OTP sent successfully. Check your messages.', 'info');
    } catch (error) {
      const message = mapFirebaseError(error);
      setErrorMessage(message);
      showToast(message, 'error');
    } finally {
      setIsSending(false);
    }
  });

  const handleVerifyOtp = handleSubmitOtp(async ({ code }) => {
    if (!verificationId || !verifiedPhone) {
      setErrorMessage('Please request a new code before verifying.');
      return;
    }

    setIsVerifying(true);
    setErrorMessage(null);

    try {
      await confirmOtp(code);

      const credential = PhoneAuthProvider.credential(verificationId, code);
      const { name, email, password } = getValues();
      await signUpWithEmailPasswordAndLinkPhone({
        name,
        email: email ?? null,
        password: password ?? null,
        phoneCredential: credential,
      });

      countdown.reset();
      resetOtp();
      setStep('success');
      setStatusMessage('Your account is ready. Redirecting you to the dashboard...');
      showToast('Account created successfully. Welcome!', 'success');
      const redirectState = location.state as { from?: { pathname?: string } } | undefined;
      const destination = redirectState?.from?.pathname ?? '/';
      window.setTimeout(() => {
        navigate(destination, { replace: true });
      }, 1200);
    } catch (error) {
      const code = (error as { code?: string })?.code;
      if (code === 'auth/email-already-in-use' && auth.currentUser) {
        await auth.currentUser.delete().catch(() => undefined);
      }
      const message = mapFirebaseError(error);
      setErrorMessage(message);
      showToast(message, 'error');
    } finally {
      setIsVerifying(false);
    }
  });

  const handleResend = useCallback(async () => {
    if (!verifiedPhone) return;
    setIsSending(true);
    setErrorMessage(null);
    try {
      await sendOtp(verifiedPhone);
      countdown.start();
      showToast('We re-sent the OTP to your phone.', 'success');
    } catch (error) {
      const message = mapFirebaseError(error);
      setErrorMessage(message);
      showToast(message, 'error');
    } finally {
      setIsSending(false);
    }
  }, [countdown, verifiedPhone]);

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-slate-950/70 px-4 py-12">
      <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=1350&q=80')] bg-cover bg-center opacity-20" aria-hidden />
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
            <h1 className="mt-10 text-3xl font-bold leading-tight">
              Your city, curated.
            </h1>
            <p className="mt-4 text-sm text-slate-200/80">
              Discover hyperlocal experiences, verified services, and trusted shops around you. Join the community in just a few
              steps.
            </p>
          </div>
          <div className="rounded-2xl bg-white/10 p-6 text-sm">
            <p className="font-semibold text-slate-100">Need help?</p>
            <p className="mt-1 text-slate-200/80">Our support team is available 24/7 at support@manacity.app.</p>
          </div>
        </motion.div>

        <div className="w-full">
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="rounded-3xl bg-white/95 p-6 shadow-2xl shadow-slate-900/10 ring-1 ring-slate-200/60 backdrop-blur dark:bg-slate-900/95 dark:ring-slate-700/60"
          >
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Create your account</h2>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                  Secure sign-up with phone verification keeps your account safe.
                </p>
              </div>
              <img src={logo} alt="Manacity" className="hidden h-10 w-auto sm:block" />
            </div>

            <AnimatePresence mode="wait">
              {step === 'form' && (
                <motion.form
                  key="signup-form"
                  variants={motionVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  transition={{ duration: 0.3, ease: 'easeInOut' }}
                  onSubmit={handleSendOtp}
                  noValidate
                  className="mt-8 space-y-5"
                >
                  {errorMessage ? <ErrorAlert title="Something went wrong" description={errorMessage} /> : null}
                  {statusMessage ? <SuccessAlert title="Heads up" description={statusMessage} /> : null}

                  {(() => {
                    const nameField = register('name');
                    return (
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
                    );
                  })()}

                  <Input
                    label="Email (optional)"
                    type="email"
                    placeholder="jane@example.com"
                    autoComplete="email"
                    {...register('email')}
                    error={errors.email?.message}
                  />

                  <Input
                    label="Password"
                    type="password"
                    autoComplete="new-password"
                    placeholder="Create a strong password"
                    helperText="At least 8 characters with uppercase, lowercase, number, and symbol. Required only when providing an email."
                    {...register('password')}
                    error={errors.password?.message}
                  />

                  <div className="grid gap-4 sm:grid-cols-[minmax(160px,0.4fr)_minmax(0,1fr)]">
                    <div>
                      <label htmlFor="signup-country" className="block text-sm font-semibold text-slate-700 dark:text-slate-200">
                        Country
                      </label>
                      <select
                        id="signup-country"
                        className="mt-1 block w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 shadow-sm transition focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                        {...register('country')}
                      >
                        {COUNTRY_OPTIONS.map((country) => (
                          <option key={country.code} value={country.code}>
                            {country.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <Input
                      label="Phone number"
                      placeholder="98765 43210"
                      inputMode="tel"
                      autoComplete="tel"
                      {...register('phone')}
                      error={errors.phone?.message}
                    />
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-blue-50/70 px-5 py-4 text-sm text-blue-900 ring-1 ring-blue-100 dark:bg-blue-500/10 dark:text-blue-100 dark:ring-blue-500/40">
                    <div>
                      <p className="font-semibold">Why phone verification?</p>
                      <p className="text-sm opacity-80">It helps us secure your account and recover it if you ever get locked out.</p>
                    </div>
                    <span className="rounded-full bg-blue-600 px-4 py-1 text-xs font-semibold uppercase tracking-wide text-white">
                      {selectedCountryOption.dialCode}
                    </span>
                  </div>

                  <Button
                    type="submit"
                    className="w-full"
                    loading={isSubmitting || isSending}
                    disabled={!isValid || isSubmitting || isSending}
                  >
                    Send verification code
                  </Button>
                </motion.form>
              )}

              {step === 'otp' && (
                <motion.form
                  key="otp-form"
                  variants={motionVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  transition={{ duration: 0.3, ease: 'easeInOut' }}
                  onSubmit={handleVerifyOtp}
                  className="mt-8 space-y-6"
                >
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                      Enter the {OTP_LENGTH}-digit code sent to {verifiedPhone ?? 'your phone'}.
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Codes expire quickly for security. Request a new one if it doesn’t arrive.
                    </p>
                  </div>

                  {errorMessage ? <ErrorAlert title="Verification failed" description={errorMessage} /> : null}
                  {statusMessage ? <SuccessAlert title="Code sent" description={statusMessage} /> : null}

                  <div>
                    <label htmlFor="otp-code" className="block text-sm font-semibold text-slate-700 dark:text-slate-200">
                      Verification code
                    </label>
                    {(() => {
                      const otpField = registerOtp('code');
                      return (
                        <input
                          id="otp-code"
                          type="text"
                          inputMode="numeric"
                          maxLength={OTP_LENGTH}
                          {...otpField}
                          ref={(node) => {
                            otpField.ref(node);
                            otpFieldRef.current = node;
                          }}
                          className="mt-1 block w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-center text-2xl tracking-[0.6rem] text-slate-900 shadow focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/15 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                          aria-invalid={Boolean(otpErrors.code)}
                        />
                      );
                    })()}
                    {otpErrors.code ? (
                      <p className="mt-2 text-xs font-medium text-rose-600 dark:text-rose-400">{otpErrors.code.message}</p>
                    ) : null}
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-slate-600 dark:text-slate-300">
                    <button
                      type="button"
                      className="font-semibold text-blue-600 hover:text-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500"
                      disabled={countdown.isRunning || isSending}
                      onClick={handleResend}
                    >
                      {countdown.isRunning ? `Resend available in ${countdown.remaining}s` : 'Resend code'}
                    </button>
                    <button
                      type="button"
                      className="text-sm font-semibold text-slate-500 hover:text-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-slate-400"
                      onClick={() => {
                        setStep('form');
                        setErrorMessage(null);
                        setStatusMessage(null);
                        setVerifiedPhone(null);
                        setVerificationId(null);
                        countdown.reset();
                      }}
                    >
                      Change phone number
                    </button>
                  </div>

                  <Button type="submit" className="w-full" loading={isVerifying}>
                    Verify and create account
                  </Button>
                </motion.form>
              )}

              {step === 'success' && (
                <motion.div
                  key="success"
                  variants={motionVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  transition={{ duration: 0.3, ease: 'easeInOut' }}
                  className="mt-8 space-y-6"
                >
                  <SuccessAlert
                    title="Welcome to Manacity!"
                    description={statusMessage ?? 'We are setting things up for you. Hang tight!'}
                  />
                  <div className="flex items-center justify-center gap-3 text-sm text-slate-600 dark:text-slate-300">
                    <Spinner size="lg" ariaLabel="Redirecting" />
                    <span>Redirecting to your personalized dashboard…</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="mt-10 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-600 dark:text-slate-300">
              <p>Already have an account?</p>
              <Button
                variant="outline"
                className="font-semibold"
                onClick={() => navigate(paths.auth.login())}
              >
                Sign in instead
              </Button>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default Signup;
