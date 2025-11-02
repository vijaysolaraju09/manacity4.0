import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import './ForgotPassword.scss';
import logo from '@/assets/logo.png';
import fallbackImage from '@/assets/no-image.svg';
import Loader from '@/components/Loader';
import showToast from '@/components/ui/Toast';
import { paths } from '@/routes/paths';
import { normalizePhoneDigits } from '@/utils/phone';
import { createZodResolver } from '@/lib/createZodResolver';
import { useForm } from '@/components/ui/form';
import * as z from 'zod';
import OTPPhoneFirebase from '@/components/forms/OTPPhoneFirebase';

const ForgotSchema = z.object({
  phone: z.string().regex(/^\d{10}$/, 'Phone number must be 10 digits'),
});

type ForgotFormValues = z.infer<typeof ForgotSchema>;

const defaultCountryCode = '+91';

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [otpStep, setOtpStep] = useState(false);
  const [resetPhone, setResetPhone] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isValid, isSubmitting },
  } = useForm<ForgotFormValues>({
    resolver: createZodResolver(ForgotSchema),
    mode: 'onChange',
  });

  const onSubmitPhone = (data: ForgotFormValues) => {
    const normalizedPhone = normalizePhoneDigits(data.phone);
    if (!normalizedPhone) {
      setOtpStep(false);
      showToast('Enter a valid phone number.', 'error');
      return;
    }

    setResetPhone(normalizedPhone);
    setOtpStep(true);
  };

  const handleOtpVerified = () => {
    if (!resetPhone) {
      return;
    }

    navigate(paths.auth.reset(), { state: { phone: resetPhone }, replace: true });
  };

  return (
    <div className="forgot-page">
      <motion.div
        className="panel"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7 }}
      >
        <img
          src={logo}
          alt="Manacity Logo"
          className="logo"
          onError={(event) => {
            event.currentTarget.src = fallbackImage;
          }}
        />
        {!otpStep ? (
          <>
            <h2 className="title">Reset Your Password</h2>
            <p className="hint">Enter your phone number to receive an OTP for password reset.</p>
            <form onSubmit={handleSubmit(onSubmitPhone)} noValidate>
              <div className="control">
                <label htmlFor="reset-phone">Phone Number</label>
                <input
                  type="tel"
                  id="reset-phone"
                  {...register('phone')}
                  inputMode="tel"
                  pattern="\d{10}"
                  placeholder="Enter your phone number"
                  autoComplete="tel"
                />
                {errors.phone && <div className="error">{errors.phone.message}</div>}
              </div>
              <div className="actions">
                <motion.button
                  type="submit"
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.96 }}
                  disabled={!isValid || isSubmitting}
                >
                  {isSubmitting ? <Loader /> : 'Send OTP'}
                </motion.button>
              </div>
            </form>
            <div className="back" onClick={() => navigate(paths.auth.login())}>
              ← Back to Login
            </div>
          </>
        ) : (
          <>
            <h2 className="title">Verify your phone</h2>
            <p className="hint">
              Enter the OTP sent via SMS to verify your identity.
              <span className="phone"> Code sent to {`••••••${resetPhone?.slice(-4)}`}</span>
            </p>
            {resetPhone && (
              <OTPPhoneFirebase phone={`${defaultCountryCode}${resetPhone}`} onVerifySuccess={handleOtpVerified} />
            )}
            <div className="links">
              <span
                onClick={() => {
                  setOtpStep(false);
                  setResetPhone(null);
                }}
              >
                Use a different number
              </span>
            </div>
            <div className="back" onClick={() => navigate(paths.auth.login())}>
              ← Back to Login
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
};

export default ForgotPassword;
