import { useEffect, useState, useRef } from 'react';
import { RecaptchaVerifier, signInWithPhoneNumber, signOut, type ConfirmationResult } from 'firebase/auth';
import { motion } from 'framer-motion';
import { auth } from '@/firebase/firebase.config';
import Loader from '@/components/Loader';
import showToast from '@/components/ui/Toast';

export interface FirebaseVerificationResult {
  idToken: string;
  phoneNumber: string;
}

interface OTPPhoneFirebaseProps {
  phone: string;
  onVerifySuccess: (result: FirebaseVerificationResult) => void;
}

const OTPPhoneFirebase: React.FC<OTPPhoneFirebaseProps> = ({ phone, onVerifySuccess }) => {
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const recaptchaContainerId = useRef(`recaptcha-container-${Date.now()}`);

  useEffect(() => {
    setLoading(true);
    const verifier = new RecaptchaVerifier(
      auth,
      recaptchaContainerId.current,
      {
        size: 'invisible',
      },
    );

    signInWithPhoneNumber(auth, phone, verifier)
      .then((result) => {
        setConfirmationResult(result);
        showToast(`OTP sent to ${phone}`, 'success');
      })
      .catch((err: unknown) => {
        console.error('OTP send error', err);
        let message = 'Failed to send OTP. Please try again.';
        let hasCustomMessage = false;
        if (typeof err === 'object' && err && 'code' in err) {
          const { code } = err as { code?: string };
          if (code === 'auth/billing-not-enabled') {
            message =
              'Phone verification is not configured for this environment. Please contact support to finish setting up phone authentication.';
            hasCustomMessage = true;
          }
        }
        if (
          !hasCustomMessage &&
          typeof err === 'object' &&
          err &&
          'message' in err &&
          typeof (err as { message?: string }).message === 'string'
        ) {
          message = (err as { message: string }).message || message;
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
      const credential = await confirmationResult.confirm(code);
      const firebaseUser = credential.user;
      const idToken = await firebaseUser.getIdToken();
      const phoneNumber = firebaseUser.phoneNumber || phone;
      await signOut(auth);
      showToast('Phone number verified successfully.', 'success');
      onVerifySuccess({ idToken, phoneNumber });
    } catch (err) {
      console.error('OTP verification error', err);
      const message = 'Invalid or expired OTP. Please try again.';
      setError(message);
      showToast(message, 'error');
      try {
        await signOut(auth);
      } catch (signOutError) {
        console.warn('Failed to sign out after OTP error', signOutError);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="otp-phone-verify">
      <div id={recaptchaContainerId.current} />
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
          <motion.button type="submit" whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} disabled={loading}>
            {loading ? <Loader /> : 'Verify'}
          </motion.button>
        </div>
      </form>
    </div>
  );
};

export default OTPPhoneFirebase;
