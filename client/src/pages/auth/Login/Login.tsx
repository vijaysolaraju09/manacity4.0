import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { Eye, EyeOff } from 'lucide-react';
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
  const [errors, setErrors] = useState<{ phone?: string; password?: string; general?: string }>({});
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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

    try {
      setLoading(true);
      setErrors({});
      await dispatch(loginThunk({ phone: normalizedPhone, password })).unwrap();
      navigate(paths.home());
      showToast('Logged in successfully', 'success');
    } catch (err: any) {
      const message = toErrorMessage(err);
      setErrors({ general: message });
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
              type="tel"
              name="phone"
              placeholder="Enter phone number"
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value);
                if (errors.phone || errors.general) {
                  setErrors((prev) => ({ ...prev, phone: undefined, general: undefined }));
                }
              }}
              required
              inputMode="tel"
              pattern="\d{10,14}"
              autoComplete="tel"
            />
            {errors.phone && <div className="error">{errors.phone}</div>}
          </div>

          <div className="control">
            <label htmlFor="login-password">Password</label>
            <div className="password-field">
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                name="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errors.password || errors.general) {
                    setErrors((prev) => ({ ...prev, password: undefined, general: undefined }));
                  }
                }}
                required
                minLength={6}
                autoComplete="current-password"
              />
              <button
                type="button"
                className="toggle"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                onClick={() => setShowPassword((prev) => !prev)}
              >
                {showPassword ? (
                  <EyeOff aria-hidden="true" className="h-4 w-4" />
                ) : (
                  <Eye aria-hidden="true" className="h-4 w-4" />
                )}
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
              {loading ? <Loader /> : 'Login'}
            </motion.button>
          </div>
        </form>

        <div className="links">
          <span onClick={() => navigate(paths.auth.signup())}>Create Account</span>
          <span onClick={() => navigate(paths.auth.forgot())} className="forgot-link">
            Forgot password?
          </span>
        </div>

        <div className="back" onClick={() => navigate(paths.landing())}>← Back to Landing</div>
      </motion.div>
    </div>
  );
};

export default Login;
