import { useEffect, useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';
import { motion } from 'framer-motion';
import { useLocation, useNavigate } from 'react-router-dom';
import './VerifyOtp.scss';
import logo from '@/assets/logo.png';
import fallbackImage from '@/assets/no-image.svg';
import Loader from '@/components/Loader';
import showToast from '@/components/ui/Toast';
import { http } from '@/lib/http';
import { toErrorMessage } from '@/lib/response';
import { paths } from '@/routes/paths';
import { setToken, setUser } from '@/store/slices/authSlice';
import type { AppDispatch } from '@/store';

interface LocationState {
  phone?: string;
  message?: string;
}

const VerifyOtp = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const location = useLocation();
  const state = location.state as LocationState | null;
  const phone = state?.phone ?? '';
  const infoMessage = state?.message;

  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!phone) {
      navigate(paths.auth.signup(), { replace: true });
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
      showToast('Verification session expired. Please sign up again.', 'error');
      navigate(paths.auth.signup(), { replace: true });
      return;
    }

    if (!code || !/^\d{6}$/.test(code)) {
      setError('Enter the 6-digit OTP sent to your phone.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      const res = await http.post('/auth/verify-phone', { phone, code });
      const data = res.data?.data;
      if (!data?.token || !data?.user) {
        throw new Error('Invalid response');
      }
      dispatch(setToken(data.token));
      dispatch(setUser(data.user));
      showToast('Phone verified successfully.', 'success');
      navigate(paths.home());
    } catch (err) {
      const message = toErrorMessage(err) || 'Verification failed. Please try again.';
      setError(message);
      showToast(message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="verify-page">
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
        <h2 className="title">Verify your phone</h2>
        <p className="hint">
          {infoMessage ?? 'Enter the 6-digit code we sent via SMS to confirm your account.'}
          {maskedPhone && <span className="phone"> Code sent to {maskedPhone}.</span>}
        </p>

        <form onSubmit={handleSubmit} noValidate>
          <div className="control">
            <label htmlFor="verify-otp">OTP Code</label>
            <input
              id="verify-otp"
              type="tel"
              inputMode="numeric"
              pattern="\d*"
              maxLength={6}
              value={code}
              onChange={(event) => {
                const next = event.target.value.replace(/[^\d]/g, '');
                setCode(next);
                if (error) {
                  setError('');
                }
              }}
              placeholder="Enter 6-digit code"
              required
              autoComplete="one-time-code"
            />
          </div>

          {error && <div className="error">{error}</div>}

          <div className="actions">
            <motion.button
              type="submit"
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              disabled={loading}
            >
              {loading ? <Loader /> : 'Verify'}
            </motion.button>
          </div>
        </form>

        <div className="links">
          <span onClick={() => navigate(paths.auth.signup())}>Use a different number</span>
        </div>
        <div className="back" onClick={() => navigate(paths.auth.login())}>← Back to Login</div>
      </motion.div>
    </div>
  );
};

export default VerifyOtp;
