import { useState } from 'react';
import { motion } from 'framer-motion';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { ModalSheet } from '../../components/base';
import { clearUser } from '../../store/slices/userSlice';
import { useTheme, type Theme } from '../../theme/ThemeProvider';
import styles from './Settings.module.scss';

const Settings = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { theme, setTheme, availableThemes } = useTheme();
  const [sheetOpen, setSheetOpen] = useState(false);

  const handleSelectTheme = (option: Theme) => {
    setTheme(option);
    setSheetOpen(false);
  };

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
      <fieldset className={styles.themeSection}>
        <legend>Theme</legend>
        <p className={styles.description}>
          Themes apply instantly and persist on this device.
        </p>
        <button
          type="button"
          className={styles.chooseThemeBtn}
          onClick={() => setSheetOpen(true)}
        >
          Choose Theme
        </button>
        <div className={`${styles.themeOptions} ${styles.desktop}`}>
          {availableThemes.map((option) => (
            <label
              key={option}
              className={`${styles.themeOption} ${
                theme === option ? styles.selected : ''
              }`}
            >
              <input
                type="radio"
                name="theme"
                value={option}
                checked={theme === option}
                onChange={() => setTheme(option)}
              />
              <div className={styles.swatch} data-theme={option}>
                <span className={styles.swatchText}>Aa</span>
                <span className={styles.swatchPrimary} />
              </div>
              <span className={styles.optionLabel}>
                {option.charAt(0).toUpperCase() + option.slice(1)}
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <ModalSheet open={sheetOpen} onClose={() => setSheetOpen(false)}>
        <div className={styles.themeOptions}>
          {availableThemes.map((option) => (
            <label
              key={option}
              className={`${styles.themeOption} ${
                theme === option ? styles.selected : ''
              }`}
            >
              <input
                type="radio"
                name="theme"
                value={option}
                checked={theme === option}
                onChange={() => handleSelectTheme(option)}
              />
              <div className={styles.swatch} data-theme={option}>
                <span className={styles.swatchText}>Aa</span>
                <span className={styles.swatchPrimary} />
              </div>
              <span className={styles.optionLabel}>
                {option.charAt(0).toUpperCase() + option.slice(1)}
              </span>
            </label>
          ))}
        </div>
      </ModalSheet>
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
