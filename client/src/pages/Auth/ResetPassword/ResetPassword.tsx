import { useEffect, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import Loader from '@/components/Loader';
import showToast from '@/components/ui/Toast';
import { AuthCard, AuthShell, Button, cn } from '@/components/auth/AuthShell';
import { paths } from '@/routes/paths';
import { createZodResolver } from '@/lib/createZodResolver';
import { useForm } from '@/components/ui/form';
import * as z from 'zod';
import { resetPassword as resetPasswordApi } from '@/api/auth';
import { toErrorMessage } from '@/lib/response';

interface LocationState {
  phone?: string;
}

const ResetPasswordSchema = z.object({
  password: z.string().min(6, 'New password must be at least 6 characters long'),
});

type ResetPasswordFormValues = z.infer<typeof ResetPasswordSchema>;

const ResetPassword = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as LocationState | null;
  const phone = state?.phone ?? '';

  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isValid },
  } = useForm<ResetPasswordFormValues>({
    resolver: createZodResolver(ResetPasswordSchema),
    mode: 'onChange',
  });

  useEffect(() => {
    if (!phone) {
      navigate(paths.auth.forgot(), { replace: true });
    }
  }, [phone, navigate]);

  const onSubmitNewPassword = async (data: ResetPasswordFormValues) => {
    if (!phone) {
      showToast('Reset session expired. Please try again.', 'error');
      navigate(paths.auth.forgot(), { replace: true });
      return;
    }

    try {
      await resetPasswordApi(phone, data.password);
      showToast('Password reset successful! Please log in with your new password.', 'success');
      navigate(paths.auth.login(), { replace: true });
    } catch (error) {
      const message = toErrorMessage(error) || 'Unable to reset password. Please try again.';
      showToast(message, 'error');
    }
  };

  if (!phone) {
    return null;
  }

  return (
    <AuthShell>
      <div className="mx-auto max-w-xl">
        <AuthCard title="Set new password" subtitle="Use 8+ characters to secure your account">
          <form className="grid gap-4" onSubmit={handleSubmit(onSubmitNewPassword)} noValidate>
            <label className="text-sm">
              <div className="mb-1 text-[var(--text-muted)]">New password</div>
              <div className="relative flex items-center">
                <input
                  id="reset-password"
                  type={showPassword ? 'text' : 'password'}
                  {...register('password')}
                  placeholder="Enter new password"
                  autoComplete="new-password"
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
            </label>

            <Button type="submit" className="w-full" disabled={!isValid || isSubmitting}>
              {isSubmitting ? <Loader /> : 'Reset password'}
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
      </div>
    </AuthShell>
  );
};

export default ResetPassword;
