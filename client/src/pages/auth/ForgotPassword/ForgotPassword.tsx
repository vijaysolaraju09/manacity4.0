import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import './ForgotPassword.scss';
import logo from '../../../assets/logo.png';
import fallbackImage from '../../../assets/no-image.svg';
import Loader from '../../../components/Loader';
import showToast from '../../../components/ui/Toast';
import { http } from '@/lib/http';
import { toErrorMessage } from '@/lib/response';
import { normalizePhoneDigits } from '@/utils/phone';
import { paths } from '@/routes/paths';

const SUCCESS_MESSAGE =
  'If an account exists for that number, you will receive password reset instructions shortly.';

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);
  const redirectTimer = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (redirectTimer.current) {
        window.clearTimeout(redirectTimer.current);
      }
    };
  }, []);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const normalizedPhone = normalizePhoneDigits(phone);
    if (!normalizedPhone) {
      setError('Enter a valid phone number (10-14 digits).');
      setInfo('');
      return;
    }

    try {
      setLoading(true);
      setError('');
      setInfo('');
      await http.post('/auth/forgot', { phone: normalizedPhone });
      setInfo(SUCCESS_MESSAGE);
      showToast(SUCCESS_MESSAGE, 'success');
      redirectTimer.current = window.setTimeout(() => {
        navigate(paths.auth.login());
      }, 2400);
    } catch (err) {
      const message = toErrorMessage(err) || 'Unable to process your request right now.';
      setError(message);
      showToast(message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="forgot-page">
      <div className="info-panel">
        <img src={logo} alt="Manacity Logo" onError={(e) => (e.currentTarget.src = fallbackImage)} />
        <h1>Forgot your password?</h1>
        <p>Enter your registered phone number and we&apos;ll help you reset it.</p>
      </div>
      <motion.div
        className="panel"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: 'easeOut' }}
      >
        <img src={logo} alt="Manacity Logo" className="logo" onError={(e) => (e.currentTarget.src = fallbackImage)} />

        <h2 className="title">Reset your password</h2>
        <p className="hint">We&apos;ll send you a link to create a new password.</p>

        <form onSubmit={handleSubmit} noValidate>
          <div className="control">
            <label htmlFor="forgot-phone">Phone Number</label>
            <input
              id="forgot-phone"
              type="tel"
              name="phone"
              placeholder="Enter phone number"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              autoComplete="tel"
            />
          </div>

          {error && <div className="error">{error}</div>}
          {info && <div className="success" role="status">{info}</div>}

          <div className="actions">
            <motion.button
              type="submit"
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              disabled={loading}
            >
              {loading ? <Loader /> : 'Send reset link'}
            </motion.button>
          </div>
        </form>

        <div className="links">
          <span onClick={() => navigate(paths.auth.login())}>Back to login</span>
          <span onClick={() => navigate(paths.auth.signup())}>Create Account</span>
        </div>

        <div className="back" onClick={() => navigate(paths.landing())}>← Back to Landing</div>
      </motion.div>
    </div>
  );
};

export default ForgotPassword;
