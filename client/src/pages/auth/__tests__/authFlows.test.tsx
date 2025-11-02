import { describe, expect, it, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import Signup from '../Signup';
import Login from '../Login';
import ForgotPassword from '../ForgotPassword';

vi.mock('@/components/ui/Toast', () => ({
  __esModule: true,
  default: vi.fn(),
}));

const sendOtpMock = vi.fn();
const confirmOtpMock = vi.fn();

vi.mock('@/firebase/otp', () => ({
  sendOtp: sendOtpMock,
  confirmOtp: confirmOtpMock,
}));

const signInMock = vi.fn();
const setRememberMock = vi.fn();
const signUpMock = vi.fn();
const sendPasswordResetMock = vi.fn();

vi.mock('@/auth/AuthProvider', () => ({
  useAuth: () => ({
    user: null,
    loading: false,
    rememberMe: false,
    signIn: signInMock,
    setRemember: setRememberMock,
    signUpWithEmailPasswordAndLinkPhone: signUpMock,
    sendPasswordReset: sendPasswordResetMock,
  }),
}));

describe('Auth flows', () => {
  beforeEach(() => {
    sendOtpMock.mockResolvedValue({ verificationId: 'test-verification' });
    confirmOtpMock.mockResolvedValue({ user: { uid: 'abc' } });
    signInMock.mockResolvedValue({ user: { uid: '123' } });
    setRememberMock.mockResolvedValue();
    signUpMock.mockResolvedValue({ user: { uid: 'xyz' } });
    sendPasswordResetMock.mockResolvedValue(undefined);
    vi.clearAllMocks();
  });

  it('shows validation message when submitting signup without details', async () => {
    render(
      <MemoryRouter>
        <Signup />
      </MemoryRouter>,
    );

    await userEvent.click(screen.getByRole('button', { name: /send verification code/i }));
    expect(await screen.findByText(/name must be at least/i)).toBeInTheDocument();
  });

  it('progresses to OTP step after sending code', async () => {
    render(
      <MemoryRouter>
        <Signup />
      </MemoryRouter>,
    );

    await userEvent.type(screen.getByLabelText(/full name/i), 'Jane Example');
    await userEvent.type(screen.getByLabelText(/^email/i), 'jane@example.com');
    await userEvent.type(screen.getByLabelText(/^password/i), 'Password1!');
    await userEvent.type(screen.getByLabelText(/phone number/i), '9876543210');

    await userEvent.click(screen.getByRole('button', { name: /send verification code/i }));

    await waitFor(() => expect(sendOtpMock).toHaveBeenCalledTimes(1));
    expect(await screen.findByText(/verification code/i)).toBeInTheDocument();
  });

  it('calls setRemember when logging in with remember me selected', async () => {
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>,
    );

    await userEvent.type(screen.getByLabelText(/^email/i), 'user@example.com');
    await userEvent.type(screen.getByLabelText(/^password/i), 'Password1!');
    await userEvent.click(screen.getByRole('checkbox', { name: /remember me/i }));
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => expect(setRememberMock).toHaveBeenCalledWith(true));
    expect(signInMock).toHaveBeenCalledWith({ email: 'user@example.com', password: 'Password1!' });
  });

  it('sends password reset email when requested', async () => {
    render(
      <MemoryRouter>
        <ForgotPassword />
      </MemoryRouter>,
    );

    await userEvent.type(screen.getByLabelText(/^email/i), 'recovery@example.com');
    await userEvent.click(screen.getByRole('button', { name: /send reset link/i }));

    await waitFor(() => expect(sendPasswordResetMock).toHaveBeenCalledWith('recovery@example.com'));
  });
});
