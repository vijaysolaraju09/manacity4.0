import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import "./LandingPage.scss";
import logo from "../../assets/logo.png"; // ✅ using logo from src/assets
import fallbackImage from "../../assets/no-image.svg";

const LandingPage = () => {
  const navigate = useNavigate();

  return (
    <div className="landing-page">
      <motion.div
        className="content"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: "easeOut" }}
      >
        <img src={logo} alt="Manacity Logo" className="logo" onError={(e) => (e.currentTarget.src = fallbackImage)} />

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
      </motion.div>
    </div>
  );
};

export default LandingPage;
