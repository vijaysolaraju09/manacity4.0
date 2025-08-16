import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { verifyOtp, resendOtp as resendOtpApi } from '../../api/auth';
import Loader from '../../components/Loader';
import './OtpPage.scss';

const OtpPage = () => {
  const [otp, setOtp] = useState<string[]>(['', '', '', '']);
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const phone = (location.state as { phone?: string })?.phone || '';

  const handleChange = (index: number, value: string) => {
    if (/^[0-9]?$/.test(value)) {
      const updated = [...otp];
      updated[index] = value;
      setOtp(updated);

      const nextInput = document.getElementById(`otp-${index + 1}`);
      if (value && nextInput) nextInput.focus();
    }
  };

  const handleVerify = async () => {
    const code = otp.join('');
    if (code.length === 4) {
      try {
        setVerifying(true);
        await verifyOtp(phone, code);
        navigate('/profile');
      } catch (err) {
        console.error(err);
        alert('OTP verification failed');
      } finally {
        setVerifying(false);
      }
    }
  };

  const resendOtp = async () => {
    try {
      setResending(true);
      await resendOtpApi(phone);
      alert(`OTP resent to ${phone}`);
    } catch (err) {
      console.error(err);
      alert('Failed to resend OTP');
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
        <p>Enter the 4-digit code sent to <strong>{phone}</strong></p>

        <div className="otp-inputs">
          {otp.map((digit, i) => (
            <input
              key={i}
              id={`otp-${i}`}
              type="text"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(i, e.target.value)}
            />
          ))}
        </div>

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
          style={{ pointerEvents: resending ? 'none' : 'auto' }}
        >
          {resending ? 'Sending...' : 'Resend OTP'}
        </button>

        <button type="button" className="link back" onClick={() => navigate('/signup')}>
          ← Back to Signup
        </button>
      </motion.div>
    </div>
  );
};

export default OtpPage;
