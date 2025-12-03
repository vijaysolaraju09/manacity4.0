import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { RouterProvider, createMemoryRouter } from 'react-router-dom';

const mockState = {
  auth: { token: 'token' },
  cart: { items: [] },
  notifs: { unread: 0 },
};

vi.mock('react-redux', async () => {
  const actual = await vi.importActual<typeof import('react-redux')>('react-redux');
  return {
    ...actual,
    useSelector: (selector: (state: typeof mockState) => unknown) => selector(mockState),
    useDispatch: () => vi.fn(),
  };
});

vi.mock('@/pages/ProductDetails/ProductDetails', () => ({
  __esModule: true,
  default: () => <div data-testid="product-details-page">Product detail</div>,
}));

vi.mock('@/pages/Orders/MyOrders', () => ({
  __esModule: true,
  default: () => <div data-testid="orders-mine-page">My orders</div>,
}));

vi.mock('@/pages/Orders/OrderDetail', () => ({
  __esModule: true,
  default: () => <div data-testid="order-detail-page">Order detail</div>,
}));

vi.mock('@/pages/Profile/History', () => ({
  __esModule: true,
  default: () => <div data-testid="history-page">History</div>,
}));

vi.mock('@/pages/ServiceRequests/MyRequests', () => ({
  __esModule: true,
  default: () => <div data-testid="requests-page">Requests</div>,
}));

vi.mock('@/pages/ServiceRequests/ServiceRequestDetail', () => ({
  __esModule: true,
  default: () => <div data-testid="request-detail-page">Request detail</div>,
}));

vi.mock('@/pages/ManageProducts/ManageProducts', () => ({
  __esModule: true,
  default: () => <div data-testid="manage-products-page">Manage products</div>,
}));

vi.mock('@/pages/Orders/ReceivedOrders', () => ({
  __esModule: true,
  default: () => <div data-testid="orders-received-page">Orders received</div>,
}));

describe('AppRoutes (authenticated routes)', () => {
  const renderAt = async (path: string) => {
    const { default: AppRoutes } = await import('./AppRoutes');
    const router = createMemoryRouter(
      [
        {
          path: '*',
          element: <AppRoutes />,
        },
      ],
      { initialEntries: [path] },
    );

    render(<RouterProvider router={router} />);
    return router;
  };

  it('renders product detail route without redirecting', async () => {
    const router = await renderAt('/product/abc123');
    await waitFor(() => expect(screen.getByTestId('product-details-page')).toBeInTheDocument());
    expect(router.state.location.pathname).toBe('/product/abc123');
  });

  it('renders my orders route', async () => {
    const router = await renderAt('/orders/mine');
    await waitFor(() => expect(screen.getByTestId('orders-mine-page')).toBeInTheDocument());
    expect(router.state.location.pathname).toBe('/orders/mine');
  });

  it('renders order detail route', async () => {
    const router = await renderAt('/orders/ord-1');
    await waitFor(() => expect(screen.getByTestId('order-detail-page')).toBeInTheDocument());
    expect(router.state.location.pathname).toBe('/orders/ord-1');
  });

  it('renders activity history route', async () => {
    const router = await renderAt('/history');
    await waitFor(() => expect(screen.getByTestId('history-page')).toBeInTheDocument());
    expect(router.state.location.pathname).toBe('/history');
  });

  it('renders service requests list and detail routes', async () => {
    let router = await renderAt('/requests');
    await waitFor(() => expect(screen.getByTestId('requests-page')).toBeInTheDocument());
    expect(router.state.location.pathname).toBe('/requests');

    router = await renderAt('/requests/req-9');
    await waitFor(() => expect(screen.getByTestId('request-detail-page')).toBeInTheDocument());
    expect(router.state.location.pathname).toBe('/requests/req-9');
  });

  it('renders manage products and received orders routes', async () => {
    let router = await renderAt('/manage-products');
    await waitFor(() => expect(screen.getByTestId('manage-products-page')).toBeInTheDocument());
    expect(router.state.location.pathname).toBe('/manage-products');

    router = await renderAt('/orders/received');
    await waitFor(() => expect(screen.getByTestId('orders-received-page')).toBeInTheDocument());
    expect(router.state.location.pathname).toBe('/orders/received');
  });
});
