import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth';
import './ForgotPassword.scss';
import Loader from '../../../components/Loader';
import showToast from '../../../components/ui/Toast';
import { mapFirebaseError } from '../../../lib/firebaseErrors';
import { auth } from '../../../services/firebase.config';

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const onCaptchVerify = () => {
    if (!(window as any).recaptchaVerifier) {
      (window as any).recaptchaVerifier = new RecaptchaVerifier(
        'recaptcha-container',
        {
          size: 'invisible',
          callback: () => {},
          'expired-callback': () => {},
        },
        auth
      );
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{10}$/.test(phone)) {
      setError('Enter a valid phone number');
      return;
    }
    const phoneE164 = `+91${phone}`;
    try {
      setLoading(true);
      onCaptchVerify();
      const appVerifier = (window as any).recaptchaVerifier;
      const confirmation = await signInWithPhoneNumber(auth, phoneE164, appVerifier);
      (window as any).confirmationResult = confirmation;
      showToast(`OTP sent to ${phoneE164}`, 'success');
      navigate(`/otp?purpose=reset&phone=${encodeURIComponent(phoneE164)}`);
    } catch (err: any) {
      const message = mapFirebaseError(err?.code);
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
        <h2>Reset Password</h2>
        <form onSubmit={handleSubmit} noValidate>
          <label>
            Phone Number
            <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} required />
            {error && <span className="error">{error}</span>}
          </label>
          <motion.button
            type="submit"
            className="signup-btn"
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            disabled={loading}
          >
            {loading ? <Loader /> : 'Send OTP'}
          </motion.button>
        </form>
        <button className="link back" type="button" onClick={() => navigate('/login')}>
          ← Back to Login
        </button>
      </motion.div>
    </div>
  );
};

export default ForgotPassword;
