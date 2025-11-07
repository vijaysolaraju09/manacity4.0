import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Loader from '@/components/Loader';
import showToast from '@/components/ui/Toast';
import { AuthCard, AuthShell, Button, Card, Input } from '@/components/auth/AuthShell';
import { paths } from '@/routes/paths';
import { normalizePhoneDigits } from '@/utils/phone';
import { createZodResolver } from '@/lib/createZodResolver';
import { useForm } from '@/components/ui/form';
import * as z from 'zod';
import OTPPhoneFirebase from '@/components/forms/OTPPhoneFirebase';

const ForgotSchema = z.object({
  phone: z.string().regex(/^\d{10}$/, 'Phone number must be 10 digits'),
});

type ForgotFormValues = z.infer<typeof ForgotSchema>;

const defaultCountryCode = '+91';

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [otpStep, setOtpStep] = useState(false);
  const [resetPhone, setResetPhone] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isValid, isSubmitting },
  } = useForm<ForgotFormValues>({
    resolver: createZodResolver(ForgotSchema),
    mode: 'onChange',
  });

  const onSubmitPhone = (data: ForgotFormValues) => {
    const normalizedPhone = normalizePhoneDigits(data.phone);
    if (!normalizedPhone) {
      setOtpStep(false);
      showToast('Enter a valid phone number.', 'error');
      return;
    }

    setResetPhone(normalizedPhone);
    setOtpStep(true);
  };

  const handleOtpVerified = () => {
    if (!resetPhone) {
      return;
    }

    navigate(paths.auth.reset(), { state: { phone: resetPhone }, replace: true });
  };

  return (
    <AuthShell>
      <div className="mx-auto max-w-3xl space-y-6">
        <Card className="relative overflow-hidden p-6 md:p-8">
          <div className="absolute inset-0 bg-gradient-to-br from-[var(--primary)]/15 via-transparent to-[var(--accent)]/20" />
          <div className="relative space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full bg-[var(--surface-0)] px-3 py-1 text-xs text-[var(--text-muted)]">
              <span>Password support</span>
              <span>•</span>
              <span>OTP verification</span>
            </div>
            <h1 className="text-3xl font-bold leading-tight md:text-4xl">Reset your access</h1>
            <p className="max-w-prose text-[var(--text-muted)]">
              We&apos;ll send a 6-digit code to your registered phone number.
            </p>
          </div>
        </Card>

        {!otpStep ? (
          <AuthCard title="Forgot password" subtitle="Enter your phone number to receive an OTP">
            <form className="grid gap-3" onSubmit={handleSubmit(onSubmitPhone)} noValidate>
              <Input
                label="Phone number"
                placeholder="Enter your phone number"
                inputMode="tel"
                pattern="\d{10}"
                autoComplete="tel"
                {...register('phone')}
                error={errors.phone?.message}
              />

              <Button type="submit" className="mt-1 w-full" disabled={!isValid || isSubmitting}>
                {isSubmitting ? <Loader /> : 'Send OTP'}
              </Button>

              <div className="text-center text-sm text-[var(--text-muted)]">
                <button
                  type="button"
                  className="underline transition-colors hover:text-[var(--text-primary)]"
                  onClick={() => navigate(paths.auth.login())}
                >
                  Back to login
                </button>
              </div>
            </form>
          </AuthCard>
        ) : (
          <AuthCard
            title="Verify your phone"
            subtitle={
              resetPhone
                ? `Enter the OTP sent via SMS to verify your identity. Code sent to ••••••${resetPhone.slice(-4)}`
                : 'Enter the OTP sent via SMS to verify your identity.'
            }
          >
            <div className="space-y-4">
              {resetPhone && (
                <OTPPhoneFirebase phone={`${defaultCountryCode}${resetPhone}`} onVerifySuccess={handleOtpVerified} />
              )}
              <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-[var(--text-muted)]">
                <button
                  type="button"
                  className="underline transition-colors hover:text-[var(--text-primary)]"
                  onClick={() => {
                    setOtpStep(false);
                    setResetPhone(null);
                  }}
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

export default ForgotPassword;
