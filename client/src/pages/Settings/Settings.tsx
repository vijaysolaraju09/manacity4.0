import { motion } from 'framer-motion';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { clearUser } from '../../store/slices/userSlice';
import styles from './Settings.module.scss';

const Settings = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    dispatch(clearUser());
    navigate('/login');
  };

  return (
    <motion.div
      className={styles.settings}
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <h2>Settings</h2>
      <div className={styles.dangerZone}>
        <h3>Danger Zone</h3>
        <button type="button" className={styles.logout} onClick={handleLogout}>
          Logout
        </button>
      </div>
    </motion.div>
  );
};

export default Settings;
