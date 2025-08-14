import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { FaStore, FaCalendarAlt, FaTags, FaStar, FaCheckCircle, FaCalendarCheck } from "react-icons/fa";
import Toolbar from "../../components/ui/Toolbar";
import logo from "../../assets/logo.png";
import fallbackImage from "../../assets/no-image.svg";
import "./LandingPage.scss";

const features = [
  { icon: FaStore, title: "Discover Shops", copy: "Find and connect with local businesses." },
  { icon: FaCalendarAlt, title: "Attend Events", copy: "Stay updated on what's happening nearby." },
  { icon: FaTags, title: "Exclusive Deals", copy: "Grab offers from verified merchants." },
];

const stats = [
  { icon: FaStar, label: "4.8/5 rating" },
  { icon: FaCheckCircle, label: "2k+ verified" },
  { icon: FaCalendarCheck, label: "500+ events" },
];

const LandingPage = () => {
  const navigate = useNavigate();

  return (
    <div className="landing-page">
      <Toolbar title={<span>Manacity</span>} className="landing-toolbar" />

      <motion.section
        className="hero"
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      >
        <img
          src={logo}
          alt="Manacity Logo"
          width={160}
          height={160}
          className="logo"
          onError={(e) => (e.currentTarget.src = fallbackImage)}
        />

        <h1>
          Welcome to <span>Manacity</span>
        </h1>
        <p>Explore local businesses, services, events, and more.</p>

        <div className="buttons">
          <motion.button
            className="primary"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate("/login")}
          >
            Login
          </motion.button>

          <motion.button
            className="secondary"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate("/signup")}
          >
            Sign Up
          </motion.button>
        </div>
      </motion.section>

      <motion.section
        className="features"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        {features.map(({ icon: Icon, title, copy }) => (
          <motion.div
            key={title}
            className="feature-card"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <Icon size={40} />
            <h3>{title}</h3>
            <p>{copy}</p>
          </motion.div>
        ))}
      </motion.section>

      <motion.section
        className="trust-band"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        {stats.map(({ icon: Icon, label }) => (
          <div key={label} className="stat">
            <Icon size={24} />
            <span>{label}</span>
          </div>
        ))}
      </motion.section>
    </div>
  );
};

export default LandingPage;
