import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import showToast from '@/components/ui/Toast';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ErrorAlert, SuccessAlert } from '@/components/Alerts';
import { createZodResolver } from '@/lib/createZodResolver';
import { emailSchema } from '@/utils/validation';
import { useAuth } from '@/auth/AuthProvider';
import logo from '@/assets/logo.png';
import fallbackImage from '@/assets/no-image.svg';

const forgotSchema = z.object({
  email: emailSchema,
});

type ForgotSchema = z.infer<typeof forgotSchema>;

const ForgotPassword = () => {
  const navigate = useNavigate();
  const emailRef = useRef<HTMLInputElement | null>(null);
  const { sendPasswordReset } = useAuth();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotSchema>({
    resolver: createZodResolver(forgotSchema),
    mode: 'onSubmit',
  });

  useEffect(() => {
    emailRef.current?.focus();
  }, []);

  const onSubmit = handleSubmit(async ({ email }) => {
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      await sendPasswordReset(email);
      const message = 'If an account exists for this email, we sent a reset link. Check your inbox and spam folder.';
      setSuccessMessage(message);
      showToast('Reset link sent. Check your inbox.', 'success');
    } catch (error) {
      const code = (error as { code?: string })?.code ?? 'auth/unknown-error';
      let message = 'We could not send the reset email. Please try again.';
      if (code === 'auth/user-not-found') {
        message = 'We could not find an account with that email.';
      } else if (code === 'auth/too-many-requests') {
        message = 'Too many requests. Please wait a few minutes before trying again.';
      }
      setErrorMessage(message);
      showToast(message, 'error');
    }
  });

  const emailField = register('email');

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950/85 px-4 py-12">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-950 via-slate-900 to-slate-950 opacity-90" aria-hidden />
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="relative z-10 w-full max-w-2xl rounded-3xl bg-white/95 p-10 shadow-2xl shadow-blue-900/20 ring-1 ring-slate-200/60 backdrop-blur dark:bg-slate-900/95 dark:ring-slate-700/60"
      >
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Reset your password</h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              We’ll send a secure link to your email so you can set a new password.
            </p>
          </div>
          <img
            src={logo}
            alt="Manacity"
            className="h-10 w-auto"
            onError={(event) => {
              event.currentTarget.src = fallbackImage;
            }}
          />
        </div>

        <form onSubmit={onSubmit} noValidate className="mt-8 space-y-6">
          {errorMessage ? <ErrorAlert title="Could not send email" description={errorMessage} /> : null}
          {successMessage ? <SuccessAlert title="Email sent" description={successMessage} /> : null}

          <Input
            label="Email"
            type="email"
            placeholder="you@example.com"
            autoComplete="email"
            {...emailField}
            error={errors.email?.message}
            ref={(node) => {
              emailField.ref(node);
              emailRef.current = node;
            }}
          />

          <Button type="submit" className="w-full" loading={isSubmitting}>
            Send reset link
          </Button>
        </form>

        <div className="mt-10 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-600 dark:text-slate-300">
          <button
            type="button"
            className="font-semibold text-blue-600 hover:text-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500"
            onClick={() => navigate('/auth/login')}
          >
            Back to login
          </button>
          <button
            type="button"
            className="font-semibold text-slate-500 hover:text-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-slate-400"
            onClick={() => navigate('/auth/signup')}
          >
            Create an account
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default ForgotPassword;
