import { useEffect, useState } from 'react';
import { RecaptchaVerifier, signInWithPhoneNumber, signOut, type ConfirmationResult } from 'firebase/auth';
import { motion } from 'framer-motion';
import { auth } from '@/firebase/init';
import Loader from '@/components/Loader';
import showToast from '@/components/ui/Toast';

interface OTPPhoneFirebaseProps {
  phone: string;
  onVerifySuccess: () => void;
}

const RECAPTCHA_CONTAINER_ID = 'recaptcha-container';

const OTPPhoneFirebase = ({ phone, onVerifySuccess }: OTPPhoneFirebaseProps) => {
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    setConfirmationResult(null);
    setCode('');
    setError('');
    setLoading(true);
    const containerId = RECAPTCHA_CONTAINER_ID;
    if (!document.getElementById(containerId)) {
      const container = document.createElement('div');
      container.id = containerId;
      container.style.display = 'none';
      document.body.appendChild(container);
    }
    const verifier = new RecaptchaVerifier(auth, containerId, { size: 'invisible' });

    signInWithPhoneNumber(auth, phone, verifier)
      .then((result) => {
        setConfirmationResult(result);
        showToast(`OTP sent to ${phone}`, 'success');
      })
      .catch((err) => {
        console.error('OTP send error', err);
        let message = err?.message ?? 'Failed to send OTP. Please try again.';
        const code = (err as { code?: string })?.code;
        if (code === 'auth/billing-not-enabled' || code === 'auth/quota-exceeded') {
          message = 'SMS verification is temporarily unavailable. Please try again shortly or contact support.';
        } else if (code === 'auth/too-many-requests') {
          message = 'Too many attempts. Please wait a moment before trying again.';
        }
        setError(message);
        showToast(message, 'error');
      })
      .finally(() => {
        setLoading(false);
      });

    return () => {
      try {
        verifier.clear();
      } catch (err) {
        console.warn('Failed to clear Recaptcha verifier', err);
      }
    };
  }, [phone]);

  const handleVerifyCode = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');

    if (!confirmationResult) {
      const message = 'Unable to verify at this time. Please try again.';
      setError(message);
      showToast(message, 'error');
      return;
    }

    if (!/^\d{6}$/.test(code)) {
      const message = 'Enter the 6-digit OTP sent to your phone.';
      setError(message);
      showToast(message, 'error');
      return;
    }

    try {
      setLoading(true);
      await confirmationResult.confirm(code);
      await signOut(auth);
      setConfirmationResult(null);
      showToast('Phone number verified successfully.', 'success');
      onVerifySuccess();
    } catch (err) {
      console.error('OTP verification error', err);
      const message = 'Invalid or expired OTP. Please try again.';
      setError(message);
      showToast(message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="otp-phone-verify">
      <form onSubmit={handleVerifyCode} noValidate>
        <div className="control">
          <label htmlFor="otp-code">OTP Code</label>
          <input
            id="otp-code"
            type="tel"
            inputMode="numeric"
            pattern="\d*"
            maxLength={6}
            value={code}
            onChange={(event) => {
              setCode(event.target.value.replace(/\D/g, ''));
              if (error) {
                setError('');
              }
            }}
            placeholder="Enter 6-digit code"
            required
            autoComplete="one-time-code"
          />
        </div>
        {error && <div className="error">{error}</div>}
        <div className="actions">
          <motion.button
            type="submit"
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            disabled={loading || code.length !== 6}
          >
            {loading ? <Loader /> : 'Verify'}
          </motion.button>
        </div>
      </form>
    </div>
  );
};

export default OTPPhoneFirebase;
