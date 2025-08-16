import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import logo from '../../assets/logo.png';
import fallbackImage from '../../assets/no-image.svg';
import './Landing.scss';

const Landing = () => {
  const navigate = useNavigate();

  return (
    <div className="landing">
      <motion.img
        src={logo}
        alt="Manacity Logo"
        className="logo"
        width={160}
        height={160}
        onError={(e) => (e.currentTarget.src = fallbackImage)}
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      />

      <motion.h1
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        Discover Your City
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        Shops, events and services all in one place.
      </motion.p>

      <motion.button
        className="primary-cta"
        onClick={() => navigate('/signup')}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        Get Started
      </motion.button>

      <motion.div
        className="secondary-link"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        <Link to="/login">Login</Link>
      </motion.div>
    </div>
  );
};

export default Landing;
