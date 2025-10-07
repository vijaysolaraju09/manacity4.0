import { useState } from 'react';
import { motion } from 'framer-motion';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { ModalSheet } from '../../components/base';
import { logoutUser } from '../../store/slices/authSlice';
import { setLanguage, setNotificationPrefs } from '../../store/slices/settingsSlice';
import type { AppDispatch, RootState } from '../../store';
import { useTheme, type Theme } from '../../theme/ThemeProvider';
import { paths } from '@/routes/paths';
import styles from './Settings.module.scss';

const Settings = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { theme, setTheme, availableThemes } = useTheme();
  const [sheetOpen, setSheetOpen] = useState(false);
  const settings = useSelector((state: RootState) => state.settings);

  const handleSelectTheme = (option: Theme) => {
    setTheme(option);
    setSheetOpen(false);
  };

  const handleLogout = () => {
    void dispatch(logoutUser()).finally(() => {
      navigate(paths.auth.login(), { replace: true });
    });
  };

  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const lang = e.target.value;
    localStorage.setItem('manacity_lang', lang);
    dispatch(setLanguage(lang));
  };

  const handleToggle = (
    key: keyof typeof settings.notifications,
    value: boolean,
  ) => {
    const updated = { ...settings.notifications, [key]: value };
    localStorage.setItem('manacity_prefs', JSON.stringify(updated));
    dispatch(setNotificationPrefs({ [key]: value }));
  };

  const notificationOptions: {
    key: keyof typeof settings.notifications;
    label: string;
    description: string;
  }[] = [
    {
      key: 'orderUpdates',
      label: 'Order updates',
      description: 'Get updates about the status of your orders.',
    },
    {
      key: 'offersPromos',
      label: 'Offers & promos',
      description: 'Receive special offers and promotions.',
    },
    {
      key: 'systemMessages',
      label: 'System messages',
      description: 'Be notified about important system changes.',
    },
  ];

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
      <fieldset className={styles.section}>
        <legend>Language</legend>
        <p className={styles.description}>Select your preferred language.</p>
        <select
          id="language"
          className={styles.select}
          value={settings.language}
          onChange={handleLanguageChange}
        >
          <option value="EN">English</option>
          <option value="ES">Spanish</option>
        </select>
      </fieldset>
      <fieldset className={styles.section}>
        <legend>Notifications</legend>
        {notificationOptions.map((opt) => (
          <div key={opt.key} className={styles.prefItem}>
            <div className={styles.optionRow}>
              <label htmlFor={opt.key}>{opt.label}</label>
              <input
                id={opt.key}
                type="checkbox"
                checked={settings.notifications[opt.key]}
                onChange={(e) => handleToggle(opt.key, e.target.checked)}
              />
            </div>
            <p className={styles.description}>{opt.description}</p>
          </div>
        ))}
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
