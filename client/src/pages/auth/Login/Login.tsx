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
      navigate('/home');
      showToast('Logged in successfully', 'success');
    } catch (err: any) {
      const message = err.message || 'Login failed';
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

        <h2>Login</h2>

        <form onSubmit={handleSubmit} noValidate>
          <label>
            Phone Number
            <input
              type="text"
              name="phone"
              placeholder="Enter phone number"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </label>

          <label>
            Password
            <input
              type="password"
              name="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>

          {error && <span className="error">{error}</span>}

          <motion.button
            type="submit"
            className="login-btn"
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            disabled={loading}
          >
            {loading ? <Loader /> : 'Login'}
          </motion.button>
        </form>

        <div className="links">
          <span onClick={() => navigate('/signup')}>Create Account</span>
        </div>

        <div className="back" onClick={() => navigate('/')}>← Back to Landing</div>
      </motion.div>
    </div>
  );
};

export default Login;
