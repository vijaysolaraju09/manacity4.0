import { motion } from 'framer-motion';
import './Settings.scss';

const Settings = () => (
  <motion.div
    className="settings"
    initial={{ opacity: 0, y: 30 }}
    animate={{ opacity: 1, y: 0 }}
  >
    <h2>Settings</h2>
    <p>Manage your app preferences here.</p>
  </motion.div>
);

export default Settings;
