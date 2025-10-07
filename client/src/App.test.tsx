import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RouterProvider, createMemoryRouter } from 'react-router-dom';
import { act } from 'react-dom/test-utils';

vi.mock('./components/ProtectedRoute', async () => {
  const React = await import('react');
  const { Outlet } = await import('react-router-dom');
  const ProtectedRouteMock = () => React.createElement(Outlet, null);
  return { __esModule: true, default: ProtectedRouteMock };
});

vi.mock('./components/AdminProtectedRoute', async () => {
  const React = await import('react');
  const { Outlet } = await import('react-router-dom');
  const AdminProtectedRouteMock = () => React.createElement(Outlet, null);
  return { __esModule: true, default: AdminProtectedRouteMock };
});

vi.mock('./layouts/TabLayout', async () => {
  const React = await import('react');
  const { Outlet } = await import('react-router-dom');
  const TabLayoutMock = () => React.createElement(Outlet, null);
  return { __esModule: true, default: TabLayoutMock };
});

vi.mock('./layouts/AdminLayout', async () => {
  const React = await import('react');
  const { Outlet } = await import('react-router-dom');
  const AdminLayoutMock = () => React.createElement(Outlet, null);
  return { __esModule: true, default: AdminLayoutMock };
});

vi.mock('./components/ui/FloatingCart', () => ({
  __esModule: true,
  default: () => null,
}));

vi.mock('./pages/Verified/Details', async () => {
  const React = await import('react');
  const VerifiedDetailMock = () =>
    React.createElement('div', { 'data-testid': 'verified-detail' }, 'Verified Detail Page');
  return { __esModule: true, default: VerifiedDetailMock };
});

vi.mock('./pages/Events/Events', async () => {
  const React = await import('react');
  const EventsMock = () => React.createElement('div', null, 'Events Page');
  return { __esModule: true, default: EventsMock };
});

describe('Verified detail routing', () => {
  it('replaces verified detail content when navigating to another path', async () => {
    const { AppRoutes } = await import('./App');

    const router = createMemoryRouter(
      [
        {
          path: '*',
          element: <AppRoutes />,
        },
      ],
      { initialEntries: ['/verified-users/123'] }
    );

    render(<RouterProvider router={router} />);

    expect(screen.getByTestId('verified-detail')).toBeInTheDocument();

    await act(async () => {
      await router.navigate('/events');
    });

    expect(screen.queryByTestId('verified-detail')).not.toBeInTheDocument();
    expect(screen.getByText('Events Page')).toBeInTheDocument();
  });
});
