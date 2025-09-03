import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import './Login.scss';
import logo from '../../../assets/logo.png';
import fallbackImage from '../../../assets/no-image.svg';
import Loader from '../../../components/Loader';
import showToast from '../../../components/ui/Toast';
import { sendOtp } from '../../../api/auth';

const Login = () => {
  const navigate = useNavigate();
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const normalizePhone = (value: string): string | null => {
    const digits = value.replace(/\D/g, '');
    if (digits.length === 10) return `+91${digits}`;
    if (digits.length === 12 && digits.startsWith('91')) return `+${digits}`;
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const phoneE164 = normalizePhone(phone);
    if (!phoneE164) {
      setError('Enter a valid phone number');
      return;
    }
    try {
      setLoading(true);
      setError('');
      await sendOtp(phoneE164);
      showToast(`OTP sent to ${phone}`, 'success');
      navigate(`/otp?purpose=login&phone=${encodeURIComponent(phoneE164)}`);
    } catch (err: any) {
      const message = err.message || 'Failed to send OTP';
      setError(message);
      showToast(message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="info-panel">
        <img src={logo} alt="Manacity Logo" onError={(e) => (e.currentTarget.src = fallbackImage)} />
        <h1>Welcome back!</h1>
        <p>Sign in to continue exploring your city.</p>
      </div>
      <motion.div
        className="form-card"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: 'easeOut' }}
      >
        <img src={logo} alt="Manacity Logo" className="logo" onError={(e) => (e.currentTarget.src = fallbackImage)} />

        <h2>Login with Phone</h2>

        <form onSubmit={handleSubmit} noValidate>
          <label>
            Phone Number
            <input
              type="tel"
              name="phone"
              placeholder="Enter your phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
            />
            {error && <span className="error">{error}</span>}
          </label>

          <motion.button
            type="submit"
            className="login-btn"
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            disabled={loading}
          >
            {loading ? <Loader /> : 'Send Code'}
          </motion.button>
        </form>

        <div className="links">
          <span onClick={() => navigate('/signup')}>Create Account</span>
          <Link to="/forgot-password">Forgot Password?</Link>
        </div>

        <div className="back" onClick={() => navigate('/')}>← Back to Landing</div>
      </motion.div>
    </div>
  );
};

export default Login;
