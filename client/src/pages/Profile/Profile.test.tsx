import { describe, expect, it, beforeEach, vi } from 'vitest';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { render, screen, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import type { Store } from '@reduxjs/toolkit';
import Profile from './Profile';
import authReducer from '@/store/slices/authSlice';
import type { User } from '@/types/user';

const getCurrentUserMock = vi.fn();

vi.mock('@/api/profile', () => ({
  getCurrentUser: (...args: unknown[]) => getCurrentUserMock(...(args as [])),
  requestBusiness: vi.fn(),
  requestVerification: vi.fn(),
  updateProfile: vi.fn(),
}));

vi.mock('@/components/base/ModalSheet', () => ({
  default: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/ui/Toast', () => ({
  default: vi.fn(),
}));

const createStore = (): Store =>
  configureStore({
    reducer: {
      auth: authReducer,
    },
  });

const mockUser: User = {
  id: 'user-1',
  name: 'Neon Runner',
  phone: '1234567890',
  role: 'customer',
  location: 'Sector 7',
  address: 'Hyperlane 42',
  isVerified: true,
  verificationStatus: 'approved',
  email: 'neon@runner.test',
  profession: 'Speed courier',
  bio: 'Delivering the future, one parcel at a time.',
  preferences: { theme: 'dark' },
};

const renderProfile = () =>
  render(
    <Provider store={createStore()}>
      <MemoryRouter initialEntries={['/profile']}>
        <Profile />
      </MemoryRouter>
    </Provider>,
  );

describe('Profile page', () => {
  beforeEach(() => {
    getCurrentUserMock.mockReset();
  });

  it('shows a skeleton while loading and then renders the profile card', async () => {
    let resolveProfile: ((value: User) => void) | undefined;
    const deferred = new Promise<User>((resolve) => {
      resolveProfile = resolve;
    });

    getCurrentUserMock.mockReturnValueOnce(deferred);

    const { container } = renderProfile();

    expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThanOrEqual(3);

    expect(resolveProfile).toBeDefined();
    resolveProfile?.(mockUser);

    await waitFor(() => expect(screen.getByText(mockUser.name)).toBeInTheDocument());
    expect(screen.getByText(/profile overview/i)).toBeInTheDocument();
  });

  it('renders an error card when the profile request fails', async () => {
    getCurrentUserMock.mockRejectedValueOnce(new Error('Request failed'));

    renderProfile();

    expect(await screen.findByText(/unable to load profile/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
  });
});
