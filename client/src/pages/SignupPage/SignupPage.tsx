import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import './SignupPage.scss';
import logo from '../../assets/logo.png';
import fallbackImage from '../../assets/no-image.svg';
import { signup } from '../../api/auth';
import Loader from '../../components/Loader';

const SignupPage = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '',
    phone: '',
    password: '',
    location: '',
  });
  const [errors, setErrors] = useState<{ name?: string; phone?: string; password?: string; location?: string; general?: string }>({});
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: { name?: string; phone?: string; password?: string; location?: string } = {};
    if (!form.name.trim()) newErrors.name = 'Name is required';
    if (!/^\d{10,}$/.test(form.phone)) newErrors.phone = 'Enter a valid phone number';
    if (form.password.length < 6) newErrors.password = 'Password must be at least 6 characters';
    if (!form.location) newErrors.location = 'Location is required';
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    try {
      setLoading(true);
      await signup(form);
      navigate('/login');
    } catch (err: any) {
      const data = err.response?.data;
      const fieldErrors = data?.errors;
      if (fieldErrors && typeof fieldErrors === 'object') {
        setErrors(fieldErrors);
      } else {
        const message = data?.message || 'Signup failed';
        setErrors({ general: message });
      }

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

        <form onSubmit={handleSubmit}>
          <label>
            Name
            <input type="text" name="name" required value={form.name} onChange={handleChange} />
            {errors.name && <span className="error">{errors.name}</span>}
          </label>

          <label>
            Phone Number
            <input type="tel" name="phone" required value={form.phone} onChange={handleChange} />
            {errors.phone && <span className="error">{errors.phone}</span>}
          </label>

          <label>
            Password
            <input type="password" name="password" required value={form.password} onChange={handleChange} />
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
        <div className="back" onClick={() => navigate('/')}>
          ← Back to Landing
        </div>
      </motion.div>
    </div>
  );
};

export default SignupPage;
