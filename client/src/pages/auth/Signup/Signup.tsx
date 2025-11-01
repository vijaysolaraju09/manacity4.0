import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Eye, EyeOff } from 'lucide-react';
import './Signup.scss';
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
import { useDispatch } from 'react-redux';
import { setToken, setUser } from '@/store/slices/authSlice';
import type { AppDispatch } from '@/store';
import { signup as signupApi } from '@/api/auth';
import { toErrorMessage } from '@/lib/response';

const SignupSchema = z.object({
  name: z.string().min(5, 'Name must be at least 5 characters long'),
  phone: z.string().regex(/^\d{10}$/, 'Phone number must be 10 digits'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  location: z.string().min(1, 'Location is required'),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
});

const defaultCountryCode = '+91';

type SignupFormValues = z.infer<typeof SignupSchema>;

const Signup = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const [showPassword, setShowPassword] = useState(false);
  const [otpStep, setOtpStep] = useState(false);
  const [signupData, setSignupData] = useState<SignupFormValues | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isValid, isSubmitting },
  } = useForm<SignupFormValues>({
    resolver: createZodResolver(SignupSchema),
    mode: 'onChange',
  });

  const onSubmit = (data: SignupFormValues) => {
    const normalizedPhone = normalizePhoneDigits(data.phone);
    if (!normalizedPhone) {
      setOtpStep(false);
      showToast('Enter a valid phone number.', 'error');
      return;
    }

    setSignupData({ ...data, phone: normalizedPhone });
    setOtpStep(true);
  };

  const handleOtpVerified = async () => {
    if (!signupData) {
      return;
    }

    try {
      const result = await signupApi(signupData);

      if (result?.token && result?.user) {
        dispatch(setToken(result.token));
        dispatch(setUser(result.user));
        showToast('Signup successful!', 'success');
        navigate(paths.home());
        return;
      }

      const message = result?.message || 'Phone verified. You can now log in with your password.';
      showToast(message, 'success');
      navigate(paths.auth.login());
    } catch (error) {
      const message = toErrorMessage(error) || 'Signup failed. Please try again.';
      showToast(message, 'error');
      setOtpStep(false);
    }
  };

  return (
    <div className="signup-page">
      <motion.div
        className="panel"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7 }}
      >
        <img src={logo} alt="Manacity Logo" className="logo" onError={(event) => (event.currentTarget.src = fallbackImage)} />

        {!otpStep && (
          <>
            <h2 className="title">Create Your Account</h2>
            <p className="hint">Sign up to discover shops, events, and verified services nearby.</p>

            <form onSubmit={handleSubmit(onSubmit)} noValidate>
              <div className="control">
                <label htmlFor="signup-name">Name</label>
                <input type="text" id="signup-name" {...register('name')} />
                {errors.name && <div className="error">{errors.name.message}</div>}
              </div>

              <div className="control">
                <label htmlFor="signup-phone">Phone Number</label>
                <input
                  type="tel"
                  id="signup-phone"
                  {...register('phone')}
                  inputMode="tel"
                  pattern="\d{10}"
                  placeholder="Enter phone number"
                  autoComplete="tel"
                />
                {errors.phone && <div className="error">{errors.phone.message}</div>}
              </div>

              <div className="control">
                <label htmlFor="signup-email">Email (optional)</label>
                <input type="email" id="signup-email" {...register('email')} />
                {errors.email && <div className="error">{errors.email.message}</div>}
              </div>

              <div className="control">
                <label htmlFor="signup-password">Password</label>
                <div className="password-field">
                  <input id="signup-password" type={showPassword ? 'text' : 'password'} {...register('password')} />
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

              <div className="control">
                <label htmlFor="signup-location">Location</label>
                <select id="signup-location" {...register('location')}>
                  <option value="">Select Area</option>
                  <option value="Town Center">Town Center</option>
                  <option value="Main Road">Main Road</option>
                  <option value="North Market">North Market</option>
                  <option value="Old Street">Old Street</option>
                </select>
                {errors.location && <div className="error">{errors.location.message}</div>}
              </div>

              <div className="actions">
                <motion.button type="submit" whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} disabled={!isValid || isSubmitting}>
                  {isSubmitting ? <Loader /> : 'Continue'}
                </motion.button>
              </div>
            </form>

            <div className="links">
              <span onClick={() => navigate(paths.auth.login())}>Already have an account?</span>
            </div>
            <div className="back" onClick={() => navigate(paths.landing())}>← Back to Landing</div>
          </>
        )}

        {otpStep && signupData && (
          <>
            <h2 className="title">Verify your phone</h2>
            <p className="hint">
              Enter the OTP sent via SMS to confirm your account.
              <span className="phone"> Code sent to {`••••••${signupData.phone.slice(-4)}`}</span>
            </p>
            <OTPPhoneFirebase phone={`${defaultCountryCode}${signupData.phone}`} onVerifySuccess={handleOtpVerified} />
            <div className="links">
              <span
                onClick={() => {
                  setOtpStep(false);
                }}
              >
                Use a different number
              </span>
            </div>
            <div className="back" onClick={() => navigate(paths.auth.login())}>← Back to Login</div>
          </>
        )}
      </motion.div>
    </div>
  );
};

export default Signup;
