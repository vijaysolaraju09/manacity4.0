import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Eye, EyeOff } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import './ResetPassword.scss';
import logo from '@/assets/logo.png';
import fallbackImage from '@/assets/no-image.svg';
import Loader from '@/components/Loader';
import showToast from '@/components/ui/Toast';
import { http } from '@/lib/http';
import { toErrorMessage } from '@/lib/response';
import { paths } from '@/routes/paths';

interface LocationState {
  phone?: string;
}

const ResetPassword = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as LocationState | null;
  const phone = state?.phone ?? '';

  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{ otp?: string; password?: string; general?: string }>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!phone) {
      navigate(paths.auth.forgot(), { replace: true });
    }
  }, [phone, navigate]);

  const maskedPhone = useMemo(() => {
    if (!phone) return '';
    const visible = phone.slice(-4);
    return `••••••${visible}`;
  }, [phone]);

  if (!phone) {
    return null;
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!phone) {
      showToast('Reset session expired. Please request a new code.', 'error');
      navigate(paths.auth.forgot(), { replace: true });
      return;
    }

    const fieldErrors: { otp?: string; password?: string } = {};
    if (!/^\d{6}$/.test(otp)) {
      fieldErrors.otp = 'Enter the 6-digit OTP sent to your phone.';
    }
    if (password.length < 6) {
      fieldErrors.password = 'New password must be at least 6 characters long.';
    }

    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
      return;
    }

    try {
      setLoading(true);
      setErrors({});
      await http.post('/auth/reset', { phone, code: otp, password });
      showToast('Password reset successful! Please log in with your new password.', 'success');
      navigate(paths.auth.login(), { replace: true });
    } catch (err) {
      const message = toErrorMessage(err) || 'Unable to reset password. Please try again.';
      setErrors({ general: message });
      showToast(message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="reset-page">
      <motion.div
        className="panel"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: 'easeOut' }}
      >
        <img
          src={logo}
          alt="Manacity Logo"
          className="logo"
          onError={(event) => {
            event.currentTarget.src = fallbackImage;
          }}
        />
        <h2 className="title">Reset your password</h2>
        <p className="hint">
          Enter the OTP we sent to your phone to set a new password.
          {maskedPhone && <span className="phone"> Code sent to {maskedPhone}.</span>}
        </p>

        <form onSubmit={handleSubmit} noValidate>
          <div className="control">
            <label htmlFor="reset-otp">OTP Code</label>
            <input
              id="reset-otp"
              type="tel"
              inputMode="numeric"
              pattern="\d*"
              maxLength={6}
              value={otp}
              onChange={(event) => {
                const next = event.target.value.replace(/[^\d]/g, '');
                setOtp(next);
                if (errors.otp || errors.general) {
                  setErrors((prev) => ({ ...prev, otp: undefined, general: undefined }));
                }
              }}
              placeholder="Enter 6-digit code"
              required
              autoComplete="one-time-code"
            />
            {errors.otp && <div className="error">{errors.otp}</div>}
          </div>

          <div className="control">
            <label htmlFor="reset-password">New Password</label>
            <div className="password-field">
              <input
                id="reset-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value);
                  if (errors.password || errors.general) {
                    setErrors((prev) => ({ ...prev, password: undefined, general: undefined }));
                  }
                }}
                placeholder="Enter new password"
                minLength={6}
                required
                autoComplete="new-password"
              />
              <button
                type="button"
                className="toggle"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                onClick={() => setShowPassword((prev) => !prev)}
              >
                {showPassword ? <EyeOff aria-hidden="true" className="h-4 w-4" /> : <Eye aria-hidden="true" className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {errors.password && <div className="error">{errors.password}</div>}
          {errors.general && <div className="error">{errors.general}</div>}

          <div className="actions">
            <motion.button
              type="submit"
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              disabled={loading}
            >
              {loading ? <Loader /> : 'Reset password'}
            </motion.button>
          </div>
        </form>

        <div className="links">
          <span onClick={() => navigate(paths.auth.login())}>Back to login</span>
        </div>
      </motion.div>
    </div>
  );
};

export default ResetPassword;
