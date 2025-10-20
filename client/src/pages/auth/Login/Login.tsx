import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useDispatch } from 'react-redux';
import './Login.scss';
import logo from '../../../assets/logo.png';
import fallbackImage from '../../../assets/no-image.svg';
import Loader from '../../../components/Loader';
import showToast from '../../../components/ui/Toast';
import { login as loginThunk } from '../../../store/slices/authSlice';
import type { AppDispatch } from '../../../store';
import { normalizePhoneDigits } from '@/utils/phone';
import { paths } from '@/routes/paths';
import { toErrorMessage } from '@/lib/response';

const Login = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone || !password) {
      setError('Enter your credentials');
      return;
    }

    const normalizedPhone = normalizePhoneDigits(phone);
    if (!normalizedPhone) {
      setError('Enter a valid phone number (10-14 digits).');
      return;
    }
    try {
      setLoading(true);
      setError('');
      await dispatch(loginThunk({ phone: normalizedPhone, password })).unwrap();
      navigate(paths.home());
      showToast('Logged in successfully', 'success');
    } catch (err: any) {
      const message = toErrorMessage(err);
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
        className="panel"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: 'easeOut' }}
      >
        <img src={logo} alt="Manacity Logo" className="logo" onError={(e) => (e.currentTarget.src = fallbackImage)} />

        <h2 className="title">Login</h2>
        <p className="hint">Enter your credentials to continue exploring your city.</p>

        <form onSubmit={handleSubmit} noValidate>
          <div className="control">
            <label htmlFor="login-phone">Phone Number</label>
            <input
              id="login-phone"
              type="text"
              name="phone"
              placeholder="Enter phone number"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>

          <div className="control">
            <label htmlFor="login-password">Password</label>
            <input
              id="login-password"
              type="password"
              name="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
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
              {loading ? <Loader /> : 'Login'}
            </motion.button>
          </div>
        </form>

        <div className="links">
          <span onClick={() => navigate(paths.auth.signup())}>Create Account</span>
        </div>

        <div className="back" onClick={() => navigate(paths.landing())}>← Back to Landing</div>
      </motion.div>
    </div>
  );
};

export default Login;
