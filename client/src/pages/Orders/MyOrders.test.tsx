import { describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import ordersReducer, { type OrdersSliceState } from '@/store/orders';
import MyOrders from './MyOrders';
import type { Order } from '@/store/orders';

vi.mock('@/components/ui/Toast', () => ({
  default: vi.fn(),
}));

type OrdersTestState = { orders: OrdersSliceState };

const renderWithState = (state?: Partial<OrdersTestState>) =>
  render(
    <Provider
      store={configureStore({
        reducer: { orders: ordersReducer },
        preloadedState: state,
      })}
    >
      <MemoryRouter initialEntries={['/orders/mine']}>
        <MyOrders />
      </MemoryRouter>
    </Provider>,
  );

describe('MyOrders page', () => {
  it('displays skeleton placeholders while loading', () => {
    const { container } = renderWithState({
      orders: {
        mine: { ids: [], entities: {}, status: 'loading', error: null },
        received: { ids: [], entities: {}, status: 'idle', error: null },
      },
    });

    expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0);
  });

  it('shows an error card when loading fails', async () => {
    renderWithState({
      orders: {
        mine: { ids: [], entities: {}, status: 'failed', error: 'Boom' },
        received: { ids: [], entities: {}, status: 'idle', error: null },
      },
    });

    expect(await screen.findByText('Boom')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
  });

  it('renders the empty state when there are no orders', async () => {
    renderWithState({
      orders: {
        mine: { ids: [], entities: {}, status: 'succeeded', error: null },
        received: { ids: [], entities: {}, status: 'idle', error: null },
      },
    });

    expect(
      await screen.findByText(/when you place an order, it will show up here/i),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /browse shops/i })).toBeInTheDocument();
  });

  it('renders a formatted order card when data is available', async () => {
    const order: Order = {
      id: 'order-1',
      type: 'product',
      status: 'delivered',
      items: [
        {
          id: 'item-1',
          productId: 'product-1',
          title: 'Energy Drink',
          qty: 2,
          unitPricePaise: 9900,
          subtotalPaise: 19800,
          image: undefined,
          options: null,
        },
      ],
      totals: {
        itemsPaise: 19800,
        discountPaise: 0,
        taxPaise: 0,
        shippingPaise: 0,
        grandPaise: 19800,
      },
      fulfillment: { type: 'delivery' },
      shippingAddress: null,
      notes: undefined,
      currency: 'INR',
      createdAt: new Date('2024-01-02T09:00:00Z').toISOString(),
      updatedAt: new Date('2024-01-02T09:00:00Z').toISOString(),
      timeline: [],
      customer: { id: 'user-1', name: 'Test User' },
      shop: { id: 'shop-1', name: 'Arcade Alley' },
      payment: undefined,
      cancel: null,
      rating: null,
      review: null,
      contactSharedAt: null,
    };

    renderWithState({
      orders: {
        mine: {
          ids: [order.id],
          entities: { [order.id]: order },
          status: 'succeeded',
          error: null,
        },
        received: { ids: [], entities: {}, status: 'idle', error: null },
      },
    });

    expect(await screen.findByText('Arcade Alley')).toBeInTheDocument();
    expect(screen.getByText(/₹198\.00/)).toBeInTheDocument();
    expect(screen.getByText(/order id: order-1/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /view details/i })).toBeInTheDocument();
  });
});
