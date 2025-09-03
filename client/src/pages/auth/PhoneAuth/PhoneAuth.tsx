import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { motion } from 'framer-motion';
import { sendOtpToPhone, verifyOtpCode } from '../../../lib/firebase';
import { loginSuccess, setOtpVerified, addPhoneNumber } from '../../../store/slices/authSlice';
import type { AppDispatch, RootState } from '../../../store';
import showToast from '../../../components/ui/Toast';
import Loader from '../../../components/Loader';
import { mapFirebaseError } from '../../../lib/firebaseErrors';
import './PhoneAuth.scss';

const PhoneAuth = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useSelector((state: RootState) => state.auth);
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [showOtpInput, setShowOtpInput] = useState(false);

  const handleSendOtp = async () => {
    if (!/^\d{10}$/.test(phone)) {
      showToast('Enter a valid phone number', 'error');
      return;
    }
    try {
      setLoading(true);
      const phoneE164 = `+91${phone}`;
      dispatch(addPhoneNumber(phoneE164));
      await sendOtpToPhone(phoneE164);
      showToast(`OTP sent to ${phoneE164}`, 'success');
      setShowOtpInput(true);
    } catch (err: any) {
      const message = mapFirebaseError(err?.code);
      showToast(message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otp.length !== 6) return;
    try {
      setLoading(true);
      await verifyOtpCode(otp);
      dispatch(loginSuccess({ phone: `+91${phone}` }));
      dispatch(setOtpVerified(true));
      showToast('OTP verified successfully', 'success');
    } catch (err: any) {
      const message = mapFirebaseError(err?.code);
      showToast(message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="phone-auth-page">
      {!user && (
        <motion.div
          className="form-card"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
        >
          {!showOtpInput ? (
            <>
              <h2>Sign in with Phone</h2>
              <label>
                Phone Number
                <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
              </label>
              <motion.button
                className="btn btn-primary"
                onClick={handleSendOtp}
                disabled={loading}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
              >
                {loading ? <Loader /> : 'Send OTP'}
              </motion.button>
            </>
          ) : (
            <>
              <h2>Enter OTP</h2>
              <label>
                6-digit Code
                <input type="text" value={otp} maxLength={6} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))} />
              </label>
              <motion.button
                className="btn btn-primary"
                onClick={handleVerifyOtp}
                disabled={loading}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
              >
                {loading ? <Loader /> : 'Verify OTP'}
              </motion.button>
            </>
          )}
        </motion.div>
      )}
    </div>
  );
};

export default PhoneAuth;
