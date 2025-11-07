import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { Eye, EyeOff } from 'lucide-react';
import Loader from '@/components/Loader';
import showToast from '@/components/ui/Toast';
import { AuthCard, AuthShell, Button, Card, Input } from '@/components/auth/AuthShell';
import { login as loginThunk } from '@/store/slices/authSlice';
import type { AppDispatch } from '@/store';
import { normalizePhoneDigits } from '@/utils/phone';
import { paths } from '@/routes/paths';
import { toErrorMessage } from '@/lib/response';

const Login = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ phone?: string; password?: string; general?: string }>({});
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const normalizedPhone = normalizePhoneDigits(phone);
    const fieldErrors: { phone?: string; password?: string } = {};

    if (!phone.trim()) {
      fieldErrors.phone = 'Phone number is required';
    } else if (!normalizedPhone) {
      fieldErrors.phone = 'Enter a valid phone number (10-14 digits).';
    }

    if (!password) {
      fieldErrors.password = 'Password is required';
    } else if (password.length < 6) {
      fieldErrors.password = 'Password must be at least 6 characters';
    }

    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
      return;
    }

    if (!normalizedPhone) {
      return;
    }

    try {
      setLoading(true);
      setErrors({});
      await dispatch(loginThunk({ phone: normalizedPhone, password })).unwrap();
      navigate(paths.home());
      showToast('Logged in successfully', 'success');
    } catch (err) {
      const message = toErrorMessage(err);
      setErrors({ general: message });
      showToast(message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell>
      <div className="grid gap-8 md:grid-cols-2">
        <Card className="relative overflow-hidden p-6 md:p-8">
          <div className="absolute inset-0 bg-gradient-to-br from-[var(--primary)]/20 via-transparent to-[var(--accent)]/25" />
          <div className="relative space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full bg-[var(--surface-0)] px-3 py-1 text-xs text-[var(--text-muted)]">
              <span>Teal–Violet UI</span>
              <span>•</span>
              <span>Light/Dark</span>
            </div>
            <h1 className="text-3xl font-bold leading-tight md:text-4xl">Welcome to Manacity</h1>
            <p className="max-w-prose text-[var(--text-muted)]">
              Discover shops & services, join events, and manage your city life with a unified account.
            </p>
            <div className="flex flex-wrap gap-2 text-xs text-[var(--text-muted)]">
              <span className="rounded-full bg-[var(--surface-0)] px-3 py-1">Secure login</span>
              <span className="rounded-full bg-[var(--surface-0)] px-3 py-1">One account for all services</span>
            </div>
          </div>
        </Card>

        <AuthCard title="Log in" subtitle="Use your phone number and password to continue">
          <form className="grid gap-3" onSubmit={handleSubmit} noValidate>
            <Input
              label="Phone number"
              placeholder="Enter phone number"
              value={phone}
              inputMode="tel"
              pattern="\d{10,14}"
              autoComplete="tel"
              error={errors.phone}
              onChange={(event) => {
                setPhone(event.target.value);
                if (errors.phone || errors.general) {
                  setErrors((prev) => ({ ...prev, phone: undefined, general: undefined }));
                }
              }}
              required
            />

            <div className="text-sm">
              <div className="mb-1 text-[var(--text-muted)]">Password</div>
              <div className="relative flex items-center">
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value);
                    if (errors.password || errors.general) {
                      setErrors((prev) => ({ ...prev, password: undefined, general: undefined }));
                    }
                  }}
                  required
                  minLength={6}
                  autoComplete="current-password"
                  className="focus-ring w-full rounded-xl border border-[var(--border)] bg-[var(--surface-0)] px-3 py-2 pr-10 text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]/70"
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
              {errors.password && <div className="mt-1 text-xs text-red-500">{errors.password}</div>}
            </div>

            {errors.general && (
              <div className="rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-600">{errors.general}</div>
            )}

            <div className="flex items-center justify-between text-sm">
              <button
                type="button"
                className="text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]"
                onClick={() => navigate(paths.auth.signup())}
              >
                Create account
              </button>
              <button
                type="button"
                className="text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]"
                onClick={() => navigate(paths.auth.forgot())}
              >
                Forgot password?
              </button>
            </div>

            <Button type="submit" className="mt-1 w-full" disabled={loading}>
              {loading ? <Loader /> : 'Continue'}
            </Button>

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
      </div>
    </AuthShell>
  );
};

export default Login;
