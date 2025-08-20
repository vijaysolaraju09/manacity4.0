import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import './SetNewPassword.scss';
import Loader from '../../../components/Loader';
import showToast from '../../../components/ui/Toast';
import { setNewPassword } from '../../../api/auth';

const SetNewPassword = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    try {
      setLoading(true);
      await setNewPassword(token, password);
      showToast('Password updated', 'success');
      navigate('/login');
    } catch {
      const message = 'Failed to set password';
      setError(message);
      showToast(message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="forgot-page">
      <motion.div
        className="form-card"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7 }}
      >
        <h2>Set New Password</h2>
        <form onSubmit={handleSubmit} noValidate>
          <label>
            New Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            {error && <span className="error">{error}</span>}
          </label>
          <motion.button
            type="submit"
            className="signup-btn"
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            disabled={loading}
          >
            {loading ? <Loader /> : 'Update Password'}
          </motion.button>
        </form>
        <button className="link back" type="button" onClick={() => navigate('/login')}>
          ← Back to Login
        </button>
      </motion.div>
    </div>
  );
};

export default SetNewPassword;
