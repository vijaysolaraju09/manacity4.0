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

vi.mock('./pages/Shops/Shops', async () => {
  const React = await import('react');
  const ShopsMock = () =>
    React.createElement('div', { 'data-testid': 'shops-page' }, 'Shops Page');
  return { __esModule: true, default: ShopsMock };
});

vi.mock('./pages/Services/ServicesCatalog', async () => {
  const React = await import('react');
  const ServicesCatalogMock = () =>
    React.createElement('div', { 'data-testid': 'services-page' }, 'Services Page');
  return { __esModule: true, default: ServicesCatalogMock };
});

vi.mock('./pages/Services/ServiceProviders', async () => {
  const React = await import('react');
  const ServiceProvidersMock = () =>
    React.createElement('div', { 'data-testid': 'service-providers-page' }, 'Service Providers Page');
  return { __esModule: true, default: ServiceProvidersMock };
});

vi.mock('./pages/Services/ServiceRequest', async () => {
  const React = await import('react');
  const ServiceRequestMock = () =>
    React.createElement('div', { 'data-testid': 'service-request-page' }, 'Service Request Page');
  return { __esModule: true, default: ServiceRequestMock };
});

vi.mock('./pages/Services/LegacyVerified', async () => {
  const React = await import('react');
  const LegacyVerifiedMock = () =>
    React.createElement('div', { 'data-testid': 'legacy-verified-page' }, 'Legacy Verified Page');
  return { __esModule: true, default: LegacyVerifiedMock };
});

vi.mock('./pages/Verified/List', async () => {
  const React = await import('react');
  const VerifiedListMock = () =>
    React.createElement(
      'div',
      { 'data-testid': 'verified-list-page' },
      'Verified List Page',
    );
  return { __esModule: true, default: VerifiedListMock };
});

vi.mock('./pages/Verified/Details', async () => {
  const React = await import('react');
  const VerifiedDetailMock = () =>
    React.createElement('div', { 'data-testid': 'verified-detail' }, 'Verified Detail Page');
  return { __esModule: true, default: VerifiedDetailMock };
});

vi.mock('./pages/Events/Events', async () => {
  const React = await import('react');
  const EventsMock = () =>
    React.createElement('div', { 'data-testid': 'events-page' }, 'Events Page');
  return { __esModule: true, default: EventsMock };
});

vi.mock('./pages/Orders/MyOrders', async () => {
  const React = await import('react');
  const MyOrdersMock = () =>
    React.createElement('div', { 'data-testid': 'orders-page' }, 'Orders Page');
  return { __esModule: true, default: MyOrdersMock };
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
      { initialEntries: ['/providers/123'] }
    );

    render(<RouterProvider router={router} />);

    expect(screen.getByTestId('verified-detail')).toBeInTheDocument();

    await act(async () => {
      await router.navigate('/events');
    });

    expect(screen.queryByTestId('verified-detail')).not.toBeInTheDocument();
    expect(screen.getByTestId('events-page')).toBeInTheDocument();
  });
});

describe('App route transitions', () => {
  it('mounts only the active page when navigating between main tabs', async () => {
    const { AppRoutes } = await import('./App');

    const router = createMemoryRouter(
      [
        {
          path: '*',
          element: <AppRoutes />,
        },
      ],
      { initialEntries: ['/services'] },
    );

    render(<RouterProvider router={router} />);

    expect(screen.getByTestId('services-page')).toBeInTheDocument();
    expect(screen.queryByTestId('shops-page')).not.toBeInTheDocument();
    expect(screen.queryByTestId('events-page')).not.toBeInTheDocument();
    expect(screen.queryByTestId('orders-page')).not.toBeInTheDocument();

    await act(async () => {
      await router.navigate('/shops');
    });

    expect(screen.queryByTestId('services-page')).not.toBeInTheDocument();
    expect(screen.getByTestId('shops-page')).toBeInTheDocument();
    expect(screen.queryByTestId('events-page')).not.toBeInTheDocument();
    expect(screen.queryByTestId('orders-page')).not.toBeInTheDocument();

    await act(async () => {
      await router.navigate('/events');
    });

    expect(screen.queryByTestId('services-page')).not.toBeInTheDocument();
    expect(screen.queryByTestId('shops-page')).not.toBeInTheDocument();
    expect(screen.getByTestId('events-page')).toBeInTheDocument();
    expect(screen.queryByTestId('orders-page')).not.toBeInTheDocument();

    await act(async () => {
      await router.navigate('/orders/mine');
    });

    expect(screen.queryByTestId('services-page')).not.toBeInTheDocument();
    expect(screen.queryByTestId('shops-page')).not.toBeInTheDocument();
    expect(screen.queryByTestId('events-page')).not.toBeInTheDocument();
    expect(screen.getByTestId('orders-page')).toBeInTheDocument();
  });
});
