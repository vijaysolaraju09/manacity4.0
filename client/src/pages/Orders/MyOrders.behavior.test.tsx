import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import ordersReducer, { type OrdersSliceState, type Order } from '@/store/orders';
import MyOrders from './MyOrders';

vi.mock('@/components/ui/Toast', () => ({
  default: vi.fn(),
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
      <MemoryRouter initialEntries={['/orders/mine']}>
        <MyOrders />
      </MemoryRouter>
    </Provider>,
  );
};

describe('MyOrders status behaviour', () => {
  beforeEach(() => {
    navigateMock.mockReset();
  });

  it('shows the current status chip and opens details on click', async () => {
    const order: Order = {
      id: 'order-123',
      type: 'product',
      status: 'confirmed',
      items: [
        {
          id: 'item-1',
          productId: 'sku-1',
          title: 'Fresh Milk',
          qty: 1,
          unitPricePaise: 5500,
          subtotalPaise: 5500,
          image: undefined,
          options: null,
        },
      ],
      totals: {
        itemsPaise: 5500,
        discountPaise: 0,
        taxPaise: 0,
        shippingPaise: 0,
        grandPaise: 5500,
      },
      fulfillment: { type: 'delivery' },
      shippingAddress: null,
      notes: undefined,
      currency: 'INR',
      createdAt: new Date('2024-02-15T10:00:00Z').toISOString(),
      updatedAt: new Date('2024-02-15T10:00:00Z').toISOString(),
      timeline: [],
      customer: { id: 'user-1', name: 'Asha' },
      shop: { id: 'shop-1', name: 'Neighbourhood Grocer' },
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
      },
    });

    expect(await screen.findByText('Neighbourhood Grocer')).toBeInTheDocument();
    expect(screen.getByText('CONFIRMED')).toBeInTheDocument();

    const viewButton = screen.getByRole('button', { name: /view details/i });
    viewButton.click();

    expect(navigateMock).toHaveBeenCalledWith('/orders/order-123');
  });
});
