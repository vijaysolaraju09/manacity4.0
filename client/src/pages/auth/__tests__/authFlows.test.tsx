import { describe, expect, it, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import type { ReactNode } from 'react';
import Signup from '../Signup';
import Login from '../Login';
import { store } from '@/store';
import { logout } from '@/store/slices/authSlice';

vi.mock('@/components/ui/Toast', () => ({
  __esModule: true,
  default: vi.fn(),
}));

const signupMock = vi.fn();
const loginMock = vi.fn();

vi.mock('@/api/auth', () => ({
  signup: signupMock,
  login: loginMock,
}));

const renderWithProviders = (ui: ReactNode) => {
  return render(
    <Provider store={store}>
      <MemoryRouter>{ui}</MemoryRouter>
    </Provider>,
  );
};

describe('Auth flows (password-based)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    store.dispatch(logout());
    window.localStorage.clear();
    signupMock.mockResolvedValue({
      token: 'token-123',
      user: { id: 'user-1', name: 'Jane', phone: '919876543210', role: 'customer' },
    });
    loginMock.mockResolvedValue({
      token: 'token-456',
      user: { id: 'user-2', name: 'John', phone: '919876543210', role: 'customer' },
    });
  });

  it('shows validation message when submitting signup without details', async () => {
    renderWithProviders(<Signup />);

    await userEvent.click(screen.getByRole('button', { name: /create account/i }));

    expect(await screen.findByText(/full name is required/i)).toBeInTheDocument();
  });

  it('normalizes phone numbers before submitting signup', async () => {
    renderWithProviders(<Signup />);

    await userEvent.type(screen.getByLabelText(/full name/i), 'Jane Example');
    await userEvent.type(screen.getByLabelText(/phone number/i), '+91 98765 43210');
    await userEvent.type(screen.getByLabelText(/^password/i), 'secret123');
    await userEvent.type(screen.getByLabelText(/email/i), 'jane@example.com');

    await userEvent.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => expect(signupMock).toHaveBeenCalled());
    expect(signupMock).toHaveBeenCalledWith(
      expect.objectContaining({ phone: '919876543210', email: 'jane@example.com' }),
    );
  });

  it('stores remembered phone after successful login when selected', async () => {
    renderWithProviders(<Login />);

    await userEvent.type(screen.getByLabelText(/phone number/i), '+91 98765 43210');
    await userEvent.type(screen.getByLabelText(/^password/i), 'secret123');
    await userEvent.click(screen.getByRole('checkbox', { name: /remember me/i }));
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => expect(loginMock).toHaveBeenCalled());
    expect(loginMock).toHaveBeenCalledWith({ phone: '919876543210', password: 'secret123' });
    expect(window.localStorage.getItem('manacity:remembered-phone')).toBe('+91 98765 43210');
    expect(window.localStorage.getItem('manacity:remembered-flag')).toBe('true');
  });
});
