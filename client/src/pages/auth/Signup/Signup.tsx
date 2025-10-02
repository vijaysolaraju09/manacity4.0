import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { motion } from 'framer-motion';
import './Signup.scss';
import logo from '../../../assets/logo.png';
import fallbackImage from '../../../assets/no-image.svg';
import Loader from '../../../components/Loader';
import showToast from '../../../components/ui/Toast';
import type { SignupDraft } from '../../../store/slices/authSlice';
import { signup as signupThunk } from '../../../store/slices/authSlice';
import type { AppDispatch } from '../../../store';
import { normalizePhoneDigits } from '@/utils/phone';

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
      navigate('/home');
    } catch (err: any) {
      const message = err.message || 'Failed to create account';
      setErrors({ general: message });
      showToast(message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="signup-page">
      <motion.div
        className="form-card"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7 }}
      >
        <img src={logo} alt="Manacity Logo" className="logo" onError={(e) => (e.currentTarget.src = fallbackImage)} />
        <h2>Create Your Account</h2>

        <form onSubmit={handleSubmit} noValidate>
          <label>
            Name
            <input type="text" name="name" required value={form.name} onChange={handleChange} />
            {errors.name && <span className="error">{errors.name}</span>}
          </label>

          <label>
            Phone Number
            <input type="tel" name="phone" value={form.phone} onChange={handleChange} />
            {errors.phone && <span className="error">{errors.phone}</span>}
          </label>

          <label>
            Email (optional)
            <input type="email" name="email" value={form.email || ''} onChange={handleChange} />
            {errors.email && <span className="error">{errors.email}</span>}
          </label>

          <label>
            Password
            <div className="password-field">
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                required
                value={form.password}
                onChange={handleChange}
              />
              <button type="button" className="toggle" onClick={() => setShowPassword((s) => !s)}>
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
            {errors.password && <span className="error">{errors.password}</span>}
          </label>

          <label>
            Location
            <select name="location" required value={form.location} onChange={handleChange}>
              <option value="">Select Area</option>
              <option value="Town Center">Town Center</option>
              <option value="Main Road">Main Road</option>
              <option value="North Market">North Market</option>
              <option value="Old Street">Old Street</option>
            </select>
            {errors.location && <span className="error">{errors.location}</span>}
          </label>

          {errors.general && <div className="error general">{errors.general}</div>}

          <motion.button
            type="submit"
            className="signup-btn"
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            disabled={loading}
          >
            {loading ? <Loader /> : 'Continue'}
          </motion.button>
        </form>

        <div className="links">
          <span onClick={() => navigate('/login')}>Already have an account?</span>
        </div>
        <div className="back" onClick={() => navigate('/')}>← Back to Landing</div>
      </motion.div>
    </div>
  );
};

export default Signup;
