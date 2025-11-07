import { motion } from 'framer-motion';
import { useDispatch, useSelector } from 'react-redux';
import { setLanguage, setNotificationPrefs } from '../../store/slices/settingsSlice';
import type { AppDispatch, RootState } from '../../store';
import { useUnifiedLogout } from '@/auth/hooks';
import ThemeToggle from '@/components/ThemeToggle';
import styles from './Settings.module.scss';

const Settings = () => {
  const dispatch = useDispatch<AppDispatch>();
  const unifiedLogout = useUnifiedLogout();
  const settings = useSelector((state: RootState) => state.settings);

  const handleLogout = () => {
    void unifiedLogout();
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
        <ThemeToggle />
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
