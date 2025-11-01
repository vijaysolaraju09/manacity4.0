import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Eye, EyeOff } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import './ResetPassword.scss';
import logo from '@/assets/logo.png';
import fallbackImage from '@/assets/no-image.svg';
import Loader from '@/components/Loader';
import showToast from '@/components/ui/Toast';
import { paths } from '@/routes/paths';
import OTPPhoneFirebase from '@/components/forms/OTPPhoneFirebase';
import { createZodResolver } from '@/lib/createZodResolver';
import { useForm } from '@/components/ui/form';
import * as z from 'zod';
import { resetPassword as resetPasswordApi } from '@/api/auth';
import { toErrorMessage } from '@/lib/response';

interface LocationState {
  phone?: string;
}

const ResetPasswordSchema = z.object({
  password: z.string().min(6, 'New password must be at least 6 characters long'),
});

const defaultCountryCode = '+91';

type ResetPasswordFormValues = z.infer<typeof ResetPasswordSchema>;

const ResetPassword = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as LocationState | null;
  const phone = state?.phone ?? '';

  const [otpVerified, setOtpVerified] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordFormValues>({
    resolver: createZodResolver(ResetPasswordSchema),
    mode: 'onChange',
  });

  useEffect(() => {
    if (!phone) {
      navigate(paths.auth.forgot(), { replace: true });
    }
  }, [phone, navigate]);

  const maskedPhone = phone ? `••••••${phone.slice(-4)}` : '';

  const onSubmitNewPassword = async (data: ResetPasswordFormValues) => {
    if (!phone) {
      showToast('Reset session expired. Please request a new code.', 'error');
      navigate(paths.auth.forgot(), { replace: true });
      return;
    }

    try {
      await resetPasswordApi(phone, data.password);
      showToast('Password reset successful! Please log in with your new password.', 'success');
      navigate(paths.auth.login(), { replace: true });
    } catch (error) {
      const message = toErrorMessage(error) || 'Unable to reset password. Please try again.';
      showToast(message, 'error');
    }
  };

  if (!phone) {
    return null;
  }

  return (
    <div className="reset-page">
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
        <h2 className="title">Reset your password</h2>
        <p className="hint">
          {!otpVerified ? (
            <>
              Enter the OTP we sent to your phone to set a new password.
              {maskedPhone && <span className="phone"> Code sent to {maskedPhone}.</span>}
            </>
          ) : (
            'Enter a new password for your account.'
          )}
        </p>

        {!otpVerified && (
          <OTPPhoneFirebase phone={`${defaultCountryCode}${phone}`} onVerifySuccess={() => setOtpVerified(true)} />
        )}

        {otpVerified && (
          <form onSubmit={handleSubmit(onSubmitNewPassword)} noValidate>
            <div className="control">
              <label htmlFor="reset-password">New Password</label>
              <div className="password-field">
                <input
                  id="reset-password"
                  type={showPassword ? 'text' : 'password'}
                  {...register('password')}
                  placeholder="Enter new password"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="toggle"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  onClick={() => setShowPassword((prev) => !prev)}
                >
                  {showPassword ? <EyeOff aria-hidden="true" className="h-4 w-4" /> : <Eye aria-hidden="true" className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && <div className="error">{errors.password.message}</div>}
            </div>
            <div className="actions">
              <motion.button type="submit" whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} disabled={isSubmitting}>
                {isSubmitting ? <Loader /> : 'Reset password'}
              </motion.button>
            </div>
          </form>
        )}

        <div className="links">
          <span onClick={() => navigate(paths.auth.login())}>Back to login</span>
        </div>
      </motion.div>
    </div>
  );
};

export default ResetPassword;
