import { useCallback, useEffect, useRef, useState } from 'react';
import { RecaptchaVerifier, signInWithPhoneNumber, signOut, type ConfirmationResult } from 'firebase/auth';
import { motion } from 'framer-motion';
import { auth } from '@/firebase/init';
import Loader from '@/components/Loader';
import showToast from '@/components/ui/Toast';

interface OTPPhoneFirebaseProps {
  phone: string;
  onVerifySuccess: () => void;
}

type RecaptchaMode = 'invisible' | 'normal';

const RECAPTCHA_CONTAINER_ID = 'recaptcha-container';
const STUB_CODE = (import.meta.env.VITE_OTP_STUB_CODE as string | undefined)?.trim() || '000000';
const OTP_STUB_ENABLED = import.meta.env.VITE_ENABLE_OTP_STUB === 'true';

const OTPPhoneFirebase = ({ phone, onVerifySuccess }: OTPPhoneFirebaseProps) => {
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [recaptchaMode, setRecaptchaMode] = useState<RecaptchaMode>('invisible');
  const recaptchaContainerRef = useRef<HTMLDivElement | null>(null);
  const verifierRef = useRef<RecaptchaVerifier | null>(null);
  const isMountedRef = useRef(true);
  const expectedLength = OTP_STUB_ENABLED ? STUB_CODE.length || 6 : 6;

  const resetVerifier = useCallback(async () => {
    const current = verifierRef.current;
    verifierRef.current = null;
    if (current) {
      try {
        await current.clear();
      } catch (err) {
        console.warn('Failed to clear Recaptcha verifier', err);
      }
    }
  }, []);

  const sendOtp = useCallback(
    async (mode: RecaptchaMode) => {
      if (typeof window === 'undefined') {
        return;
      }

      const container = recaptchaContainerRef.current;
      if (!container) {
        console.warn('reCAPTCHA container element is missing.');
        return;
      }

      await resetVerifier();

      container.innerHTML = '';
      container.style.display = mode === 'normal' ? 'block' : 'none';
      container.style.marginTop = mode === 'normal' ? '12px' : '0';
      container.style.transform = mode === 'normal' ? 'scale(0.94)' : '';
      container.style.transformOrigin = 'top left';

      let verifier: RecaptchaVerifier;
      try {
        verifier = new RecaptchaVerifier(auth, container, {
          size: mode,
        });
      } catch (err) {
        console.error('Failed to initialize reCAPTCHA verifier', err);
        const message = 'Unable to set up phone verification at the moment. Please try again later.';
        setError(message);
        showToast(message, 'error');
        return;
      }

      verifierRef.current = verifier;

      setLoading(true);
      setConfirmationResult(null);
      setCode('');
      setError('');

      try {
        const result = await signInWithPhoneNumber(auth, phone, verifier);
        if (!isMountedRef.current) {
          return;
        }

        setConfirmationResult(result);
        showToast(`OTP sent to ${phone}`, 'success');
      } catch (err) {
        if (!isMountedRef.current) {
          return;
        }

        console.error('OTP send error', err);
        let message = (err as { message?: string })?.message ?? 'Failed to send OTP. Please try again.';
        const code = (err as { code?: string })?.code;

        if (code === 'auth/billing-not-enabled' && mode === 'invisible') {
          const advisory =
            'We need to double-check you are not a bot. Complete the reCAPTCHA challenge below and we will resend the code.';
          setError(advisory);
          showToast('Please complete the reCAPTCHA challenge to continue.', 'warning');
          setRecaptchaMode('normal');
          return;
        }

        if (code === 'auth/billing-not-enabled' || code === 'auth/quota-exceeded') {
          message =
            'SMS verification is temporarily unavailable. Please try again shortly or contact support if the issue persists.';
        } else if (code === 'auth/too-many-requests') {
          message = 'Too many attempts. Please wait a moment before trying again.';
        }

        setError(message);
        showToast(message, 'error');
      } finally {
        if (isMountedRef.current) {
          setLoading(false);
        }
      }
    },
    [phone, resetVerifier]
  );

  useEffect(() => {
    setRecaptchaMode('invisible');
  }, [phone]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!phone || OTP_STUB_ENABLED) {
      return;
    }

    if (!recaptchaContainerRef.current) {
      return;
    }

    void sendOtp(recaptchaMode);
  }, [phone, recaptchaMode, sendOtp]);

  useEffect(() => {
    return () => {
      void resetVerifier();
    };
  }, [resetVerifier]);

  const handleVerifyCode = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');

    if (OTP_STUB_ENABLED) {
      if (code === STUB_CODE) {
        showToast('Phone number verified in test mode.', 'success');
        onVerifySuccess();
      } else {
        const message = `Use the test code ${STUB_CODE} to verify.`;
        setError(message);
        showToast(message, 'error');
      }
      return;
    }

    if (!confirmationResult) {
      const message = 'Unable to verify at this time. Please try again.';
      setError(message);
      showToast(message, 'error');
      return;
    }

    const requiredLengthPattern = new RegExp(`^\\d{${expectedLength}}$`);
    if (!requiredLengthPattern.test(code)) {
      const message = `Enter the ${expectedLength}-digit OTP sent to your phone.`;
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
            maxLength={expectedLength}
            value={code}
            onChange={(event) => {
              setCode(event.target.value.replace(/\D/g, ''));
              if (error) {
                setError('');
              }
            }}
            placeholder={`Enter ${expectedLength}-digit code`}
            required
            autoComplete="one-time-code"
          />
        </div>
        {error && <div className="error">{error}</div>}
        {!OTP_STUB_ENABLED ? (
          <div
            id={RECAPTCHA_CONTAINER_ID}
            ref={recaptchaContainerRef}
            aria-hidden={recaptchaMode === 'invisible'}
            style={{ display: recaptchaMode === 'normal' ? 'block' : 'none' }}
          />
        ) : null}
        {OTP_STUB_ENABLED ? (
          <p className="mt-3 text-sm text-slate-500">
            Testing? Enter the code <span className="font-semibold">{STUB_CODE}</span> to verify instantly.
          </p>
        ) : null}
        <div className="actions">
          <motion.button
            type="submit"
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            disabled={loading || code.length !== expectedLength}
          >
            {loading ? <Loader /> : 'Verify'}
          </motion.button>
        </div>
      </form>
    </div>
  );
};

export default OTPPhoneFirebase;
