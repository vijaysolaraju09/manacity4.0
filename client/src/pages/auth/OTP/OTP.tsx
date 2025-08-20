import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { verifyOtpCode, sendOtpToPhone } from '../../../lib/firebase';
import { verifyFirebase } from '../../../api/auth';
import Loader from '../../../components/Loader';
import showToast from '../../../components/ui/Toast';
import { mapFirebaseError } from '../../../lib/firebaseErrors';
import type { SignupDraft } from '../../../api/auth';
import './OTP.scss';

const OTP = () => {
  const [otp, setOtp] = useState<string[]>(Array(6).fill(''));
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [timer, setTimer] = useState(60);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const phone = searchParams.get('phone') || '';
  const purpose = (searchParams.get('purpose') as 'signup' | 'reset') || 'signup';

  useEffect(() => {
    if (timer <= 0) return;
    const id = setInterval(() => setTimer((t) => t - 1), 1000);
    return () => clearInterval(id);
  }, [timer]);

  const handleChange = (index: number, value: string) => {
    if (/^[0-9]?$/.test(value)) {
      const updated = [...otp];
      updated[index] = value;
      setOtp(updated);
      if (value && index < otp.length - 1) {
        const nextInput = document.getElementById(`otp-${index + 1}`);
        nextInput?.focus();
      }
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      const prevInput = document.getElementById(`otp-${index - 1}`);
      prevInput?.focus();
    }
  };

  const handleVerify = async () => {
    const code = otp.join('');
    if (code.length === 6) {
      try {
        setVerifying(true);
        setError('');
        const idToken = await verifyOtpCode(code);
        const payload: any = { idToken, purpose };
        if (purpose === 'signup') {
          const raw = sessionStorage.getItem('signupDraft');
          if (!raw) {
            setError('Signup data missing');
            return;
          }
          payload.signupDraft = JSON.parse(raw) as SignupDraft;
        }
        const res = await verifyFirebase(payload);
        showToast('Verified successfully', 'success');
        if (purpose === 'signup') {
          navigate('/login');
        } else {
          navigate(`/set-new-password?token=${encodeURIComponent(res.token)}`);
        }
      } catch (err: any) {
        const message = err.response?.data?.error || mapFirebaseError(err?.code);
        setError(message);
        showToast(message, 'error');
      } finally {
        setVerifying(false);
      }
    }
  };

  const resendOtp = async () => {
    try {
      setResending(true);
      setError('');
      await sendOtpToPhone(phone);
      showToast(`OTP resent to ${phone}`, 'success');
      setTimer(60);
    } catch (err: any) {
      const message = mapFirebaseError(err?.code);
      setError(message);
      showToast(message, 'error');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="otp-page">
      <motion.div
        className="form-box"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7 }}
      >
        <h2>Verify OTP</h2>
        <p>Enter the 6-digit code sent to <strong>{phone}</strong></p>

        <div className="otp-inputs">
          {otp.map((digit, i) => (
            <input
              key={i}
              id={`otp-${i}`}
              type="text"
              inputMode="numeric"
              aria-label={`Digit ${i + 1}`}
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
            />
          ))}
        </div>

        {error && <div className="feedback error">{error}</div>}

        <motion.button
          className="btn btn-primary verify-btn"
          onClick={handleVerify}
          disabled={verifying}
        >
          {verifying ? <Loader /> : 'Verify'}
        </motion.button>

        <button
          type="button"
          className="link resend"
          onClick={resendOtp}
          disabled={timer > 0 || resending}
        >
          {resending ? 'Sending...' : timer > 0 ? `Resend in ${timer}s` : 'Resend OTP'}
        </button>

        <button type="button" className="link back" onClick={() => navigate('/signup')}>
          ← Back
        </button>
      </motion.div>
    </div>
  );
};

export default OTP;
