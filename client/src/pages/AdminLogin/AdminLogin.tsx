import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useDispatch } from 'react-redux';
import { adminLogin } from '../../api/admin';
import { setAdminToken } from '../../store/slices/adminSlice';
import type { AppDispatch } from '../../store';
import Loader from '../../components/Loader';
import './AdminLogin.scss';
import { paths } from '@/routes/paths';
import { toErrorMessage } from '@/lib/response';

const AdminLogin = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const [form, setForm] = useState({ identifier: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      setLoading(true);
      const token = await adminLogin(form);
      if (token) {
        dispatch(setAdminToken(token));
        navigate(paths.admin.root());
      }
    } catch (err: any) {
      const message = toErrorMessage(err);
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-login-page">
      <motion.form onSubmit={handleSubmit} className="admin-form" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h2>Admin Login</h2>
        <input
          name="identifier"
          placeholder="Phone or Email"
          type="text"
          value={form.identifier}
          onChange={handleChange}
          required
        />
        <input name="password" placeholder="Password" type="password" value={form.password} onChange={handleChange} required />
        {error && <div className="error">{error}</div>}
        <motion.button type="submit" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} disabled={loading}>
          {loading ? <Loader /> : 'Login'}
        </motion.button>
      </motion.form>
    </div>
  );
};

export default AdminLogin;
