import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import ordersReducer, { type OrdersSliceState, type Order } from '@/store/orders';
import ReceivedOrders from './ReceivedOrders';

const getMock = vi.fn();
const patchMock = vi.fn();

vi.mock('@/components/ui/Toast', () => ({
  default: vi.fn(),
}));

vi.mock('@/lib/http', () => ({
  http: {
    get: getMock,
    post: vi.fn(),
    delete: vi.fn(),
    patch: patchMock,
  },
}));

const navigateMock = vi.fn();

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

type OrdersTestState = { orders: OrdersSliceState };

const createOrdersState = (state?: Partial<OrdersSliceState>): OrdersSliceState => {
  const baseState = ordersReducer(undefined, { type: '@@INIT' } as { type: string });
  return {
    ...baseState,
    ...(state ?? {}),
    mine: {
      ...baseState.mine,
      ...(state?.mine ?? {}),
    },
    received: {
      ...baseState.received,
      ...(state?.received ?? {}),
    },
  };
};

const renderWithState = (state?: { orders?: Partial<OrdersSliceState> }) => {
  const mergedState: OrdersTestState = {
    orders: createOrdersState(state?.orders),
  };

  const store = configureStore({
    reducer: { orders: ordersReducer },
    preloadedState: mergedState,
  });

  return render(
    <Provider store={store}>
      <MemoryRouter initialEntries={['/orders/received']}>
        <ReceivedOrders />
      </MemoryRouter>
    </Provider>,
  );
};

describe('ReceivedOrders business actions', () => {
  const baseOrder: Order = {
    id: 'order-901',
    type: 'product',
    status: 'pending',
    items: [
      {
        id: 'line-1',
        productId: 'item-1',
        title: 'Mangoes',
        qty: 2,
        unitPricePaise: 15000,
        subtotalPaise: 30000,
        image: undefined,
        options: null,
      },
    ],
    totals: {
      itemsPaise: 30000,
      discountPaise: 0,
      taxPaise: 0,
      shippingPaise: 0,
      grandPaise: 30000,
    },
    fulfillment: { type: 'delivery' },
    shippingAddress: {
      address1: '221B Baker Street',
      city: 'London',
      pincode: 'NW16XE',
    },
    notes: undefined,
    currency: 'INR',
    createdAt: new Date('2024-03-01T09:15:00Z').toISOString(),
    updatedAt: new Date('2024-03-01T09:15:00Z').toISOString(),
    timeline: [],
    customer: { id: 'cust-1', name: 'John Watson', phone: '7000000000' },
    shop: { id: 'shop-42', name: 'Baker Street Store' },
    payment: undefined,
    cancel: null,
    rating: null,
    review: null,
    contactSharedAt: null,
  };

  beforeEach(() => {
    getMock.mockReset();
    patchMock.mockReset();
    navigateMock.mockReset();
  });

  it('optimistically marks an order as accepted and confirms on success', async () => {
    const updatedOrder: Order = { ...baseOrder, status: 'accepted' };
    patchMock.mockResolvedValueOnce({ data: { data: { order: updatedOrder } } });

    renderWithState({
      orders: {
        received: {
          ids: [baseOrder.id],
          entities: { [baseOrder.id]: baseOrder },
          status: 'succeeded',
          error: null,
        },
      },
    });

    const acceptButton = await screen.findByRole('button', { name: /accept/i });
    await userEvent.click(acceptButton);

    expect(screen.getByText('ACCEPTED')).toBeInTheDocument();
    await waitFor(() => expect(patchMock).toHaveBeenCalledWith('/api/orders/order-901/status', { status: 'accepted' }));
    await waitFor(() => expect(screen.getByText('ACCEPTED')).toBeInTheDocument());
  });

  it('rolls back the optimistic status when the update fails', async () => {
    patchMock.mockRejectedValueOnce(new Error('Network error'));

    renderWithState({
      orders: {
        received: {
          ids: [baseOrder.id],
          entities: { [baseOrder.id]: baseOrder },
          status: 'succeeded',
          error: null,
        },
      },
    });

    const acceptButton = await screen.findByRole('button', { name: /accept/i });
    await userEvent.click(acceptButton);

    expect(screen.getByText('ACCEPTED')).toBeInTheDocument();
    await waitFor(() => expect(patchMock).toHaveBeenCalled());
    await waitFor(() => expect(screen.getByText('PENDING')).toBeInTheDocument());
  });
});
