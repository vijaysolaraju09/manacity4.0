import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { motion } from 'framer-motion';
import { Eye, EyeOff } from 'lucide-react';
import './Signup.scss';
import logo from '../../../assets/logo.png';
import fallbackImage from '../../../assets/no-image.svg';
import Loader from '../../../components/Loader';
import showToast from '../../../components/ui/Toast';
import type { SignupDraft } from '../../../store/slices/authSlice';
import { signup as signupThunk } from '../../../store/slices/authSlice';
import type { AppDispatch } from '../../../store';
import { normalizePhoneDigits } from '@/utils/phone';
import { paths } from '@/routes/paths';
import { toErrorMessage } from '@/lib/response';

const Signup = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const [form, setForm] = useState<SignupDraft>({
    name: '',
    phone: '',
    password: '',
    location: '',
    email: '',
  });
  const [errors, setErrors] = useState<{
    name?: string;
    phone?: string;
    password?: string;
    location?: string;
    email?: string;
    general?: string;
  }>({});
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const normalizePhone = (phone: string): string | null =>
    normalizePhoneDigits(phone);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: {
      name?: string;
      phone?: string;
      password?: string;
      location?: string;
      email?: string;
    } = {};
    if (!form.name.trim()) newErrors.name = 'Name is required';
    const normalizedPhone = form.phone ? normalizePhone(form.phone) : null;
    if (form.phone && !normalizedPhone)
      newErrors.phone = 'Enter a valid phone number (10-14 digits).';
    if (!form.phone) newErrors.phone = 'Phone is required';
    if (form.password.length < 6)
      newErrors.password = 'Password must be at least 6 characters';
    if (!form.location) newErrors.location = 'Location is required';
    if (form.email && !/^\S+@\S+\.\S+$/.test(form.email)) newErrors.email = 'Invalid email';
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    try {
      setLoading(true);
      const payload = {
        ...form,
        phone: normalizedPhone!,
        email: form.email || undefined,
      };
      await dispatch(signupThunk(payload)).unwrap();
      showToast('Account created.', 'success');
      navigate(paths.home());
    } catch (err: any) {
      const message = toErrorMessage(err);
      setErrors({ general: message });
      showToast(message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="signup-page">
      <motion.div
        className="panel"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7 }}
      >
        <img src={logo} alt="Manacity Logo" className="logo" onError={(e) => (e.currentTarget.src = fallbackImage)} />
        <h2 className="title">Create Your Account</h2>
        <p className="hint">Sign up to discover shops, events, and verified services nearby.</p>

        <form onSubmit={handleSubmit} noValidate>
          <div className="control">
            <label htmlFor="signup-name">Name</label>
            <input type="text" id="signup-name" name="name" required value={form.name} onChange={handleChange} />
            {errors.name && <div className="error">{errors.name}</div>}
          </div>

          <div className="control">
            <label htmlFor="signup-phone">Phone Number</label>
            <input type="tel" id="signup-phone" name="phone" value={form.phone} onChange={handleChange} />
            {errors.phone && <div className="error">{errors.phone}</div>}
          </div>

          <div className="control">
            <label htmlFor="signup-email">Email (optional)</label>
            <input type="email" id="signup-email" name="email" value={form.email || ''} onChange={handleChange} />
            {errors.email && <div className="error">{errors.email}</div>}
          </div>

          <div className="control">
            <label htmlFor="signup-password">Password</label>
            <div className="password-field">
              <input
                id="signup-password"
                type={showPassword ? 'text' : 'password'}
                name="password"
                required
                value={form.password}
                onChange={handleChange}
              />
              <button
                type="button"
                className="toggle"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                onClick={() => setShowPassword((s) => !s)}
              >
                {showPassword ? (
                  <EyeOff aria-hidden="true" className="h-4 w-4" />
                ) : (
                  <Eye aria-hidden="true" className="h-4 w-4" />
                )}
              </button>
            </div>
            {errors.password && <div className="error">{errors.password}</div>}
          </div>

          <div className="control">
            <label htmlFor="signup-location">Location</label>
            <select id="signup-location" name="location" required value={form.location} onChange={handleChange}>
              <option value="">Select Area</option>
              <option value="Town Center">Town Center</option>
              <option value="Main Road">Main Road</option>
              <option value="North Market">North Market</option>
              <option value="Old Street">Old Street</option>
            </select>
            {errors.location && <div className="error">{errors.location}</div>}
          </div>

          {errors.general && <div className="error general">{errors.general}</div>}

          <div className="actions">
            <motion.button
              type="submit"
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              disabled={loading}
            >
              {loading ? <Loader /> : 'Continue'}
            </motion.button>
          </div>
        </form>

        <div className="links">
          <span onClick={() => navigate(paths.auth.login())}>Already have an account?</span>
        </div>
        <div className="back" onClick={() => navigate(paths.landing())}>← Back to Landing</div>
      </motion.div>
    </div>
  );
};

export default Signup;
