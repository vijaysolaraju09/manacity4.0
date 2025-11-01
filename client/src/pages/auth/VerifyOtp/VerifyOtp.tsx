import { useEffect, useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';
import { motion } from 'framer-motion';
import { useLocation, useNavigate } from 'react-router-dom';
import './VerifyOtp.scss';
import logo from '@/assets/logo.png';
import fallbackImage from '@/assets/no-image.svg';
import showToast from '@/components/ui/Toast';
import { http } from '@/lib/http';
import { toErrorMessage } from '@/lib/response';
import { paths } from '@/routes/paths';
import { setToken, setUser } from '@/store/slices/authSlice';
import type { AppDispatch } from '@/store';
import OTPPhoneFirebase, { type FirebaseVerificationResult } from '@/components/forms/OTPPhoneFirebase';
import { normalizePhoneDigits } from '@/utils/phone';

interface LocationState {
  phone?: string;
  message?: string;
}

const defaultCountryCode = '+91';

const VerifyOtp = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const location = useLocation();
  const state = location.state as LocationState | null;
  const phone = state?.phone ?? '';
  const infoMessage = state?.message;

  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!phone) {
      navigate(paths.auth.signup(), { replace: true });
    }
  }, [phone, navigate]);

  const maskedPhone = useMemo(() => {
    if (!phone) return '';
    const visible = phone.slice(-4);
    return `••••••${visible}`;
  }, [phone]);

  if (!phone) {
    return null;
  }

  const handleOtpSuccess = async ({ idToken, phoneNumber }: FirebaseVerificationResult) => {
    if (!phone) {
      showToast('Verification session expired. Please sign up again.', 'error');
      navigate(paths.auth.signup(), { replace: true });
      return;
    }

    const verifiedDigits = normalizePhoneDigits(phoneNumber);
    if (!verifiedDigits || !verifiedDigits.endsWith(phone)) {
      showToast('Verified phone does not match this account. Please try again.', 'error');
      return;
    }

    try {
      setSubmitting(true);
      const res = await http.post('/auth/verify-phone', { phone, firebaseIdToken: idToken });
      const data = res.data?.data;
      if (!data?.token || !data?.user) {
        throw new Error('Invalid response');
      }
      dispatch(setToken(data.token));
      dispatch(setUser(data.user));
      showToast('Phone verified successfully.', 'success');
      navigate(paths.home());
    } catch (err) {
      const message = toErrorMessage(err) || 'Verification failed. Please try again.';
      showToast(message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="verify-page">
      <motion.div
        className="panel"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: 'easeOut' }}
      >
        <img
          src={logo}
          alt="Manacity Logo"
          className="logo"
          onError={(event) => {
            event.currentTarget.src = fallbackImage;
          }}
        />
        <h2 className="title">Verify your phone</h2>
        <p className="hint">
          {infoMessage ?? 'Enter the 6-digit code we sent via SMS to confirm your account.'}
          {maskedPhone && <span className="phone"> Code sent to {maskedPhone}.</span>}
        </p>

        <div className="otp-wrapper">
          <OTPPhoneFirebase phone={`${defaultCountryCode}${phone}`} onVerifySuccess={handleOtpSuccess} />
          {submitting && <div className="otp-overlay">Processing...</div>}
        </div>

        <div className="links">
          <span onClick={() => navigate(paths.auth.signup())}>Use a different number</span>
        </div>
        <div className="back" onClick={() => navigate(paths.auth.login())}>← Back to Login</div>
      </motion.div>
    </div>
  );
};

export default VerifyOtp;
