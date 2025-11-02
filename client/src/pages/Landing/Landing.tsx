import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import logo from '../../assets/logo.png';
import fallbackImage from '../../assets/no-image.svg';
import styles from './Landing.module.scss';
import { paths } from '@/routes/paths';

const Landing = () => {
  const navigate = useNavigate();

  return (
    <div className={styles.landing}>
      <motion.img
        src={logo}
        alt="Manacity Logo"
        className="mb-6 h-32 w-32 object-contain"
        width={160}
        height={160}
        onError={(e) => (e.currentTarget.src = fallbackImage)}
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      />

      <motion.div
        className={`${styles.card} space-y-4`}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <motion.h1 className="text-3xl font-semibold text-ink-900" layout>
          Discover Your City
        </motion.h1>
        <motion.p className="text-sm text-ink-500" layout>
          Shops, events and services all in one place.
        </motion.p>
        <motion.button
          className="mt-2 inline-flex w-full items-center justify-center rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white shadow-brand hover:bg-brand-600"
          onClick={() => navigate(paths.auth.signup())}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
        >
          Get Started
        </motion.button>
      </motion.div>

      <motion.div
        className={styles.ctaBand}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.5 }}
      >
        <div className={styles.ctaBandContent}>
          <p className="text-sm text-ink-500">Already have an account?</p>
          <Link className="text-sm font-semibold text-brand-600 hover:text-brand-500" to={paths.auth.login()}>
            Login to continue
          </Link>
        </div>
      </motion.div>
    </div>
  );
};

export default Landing;
