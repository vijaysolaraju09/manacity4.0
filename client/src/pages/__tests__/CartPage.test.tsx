import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import CartPage from '../CartPage';

vi.mock('@/components/ui/Toast', () => ({
  default: vi.fn(),
}));

const getMock = vi.fn();
const postMock = vi.fn();
const deleteMock = vi.fn();

vi.mock('@/lib/http', () => ({
  http: {
    get: getMock,
    post: postMock,
    delete: deleteMock,
  },
}));

type CartItem = {
  productId: string;
  variantId?: string | null;
  name: string;
  image: string | null;
  qty: number;
  unitPricePaise: number;
  lineTotalPaise: number;
  product: { name: string };
};

type CartPayload = {
  items: CartItem[];
  subtotalPaise: number;
  discountPaise: number;
  grandPaise: number;
  currency: string;
};

const createCartResponse = (cart: CartPayload) => ({
  data: { data: { cart } },
});

const buildCart = (overrides: Partial<CartPayload> = {}): CartPayload => ({
  items: [
    {
      productId: 'prod-1',
      name: 'Artisan Bread',
      image: null,
      qty: 2,
      unitPricePaise: 9900,
      lineTotalPaise: 19800,
      product: { name: 'Artisan Bread' },
    },
  ],
  subtotalPaise: 19800,
  discountPaise: 0,
  grandPaise: 19800,
  currency: 'INR',
  ...overrides,
});

describe('CartPage', () => {
  beforeEach(() => {
    getMock.mockReset();
    postMock.mockReset();
    deleteMock.mockReset();
  });

  it('renders cart items and totals from the API response', async () => {
    getMock.mockResolvedValueOnce(createCartResponse(buildCart()));

    render(
      <MemoryRouter initialEntries={['/cart']}>
        <CartPage />
      </MemoryRouter>,
    );

    expect(await screen.findByText('Artisan Bread')).toBeInTheDocument();
    expect(screen.getByText('₹198.00')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /proceed to checkout/i })).toBeEnabled();
  });

  it('increments item quantity via the stepper', async () => {
    getMock.mockResolvedValueOnce(createCartResponse(buildCart()));
    postMock.mockResolvedValueOnce(
      createCartResponse(
        buildCart({
          items: [
            {
              productId: 'prod-1',
              name: 'Artisan Bread',
              image: null,
              qty: 3,
              unitPricePaise: 9900,
              lineTotalPaise: 29700,
              product: { name: 'Artisan Bread' },
            },
          ],
          subtotalPaise: 29700,
          grandPaise: 29700,
        }),
      ),
    );

    render(
      <MemoryRouter initialEntries={['/cart']}>
        <CartPage />
      </MemoryRouter>,
    );

    const group = await screen.findByRole('group', { name: /quantity for artisan bread/i });
    await userEvent.click(within(group).getByRole('button', { name: /increase quantity/i }));

    await waitFor(() =>
      expect(postMock).toHaveBeenCalledWith('/api/cart', {
        productId: 'prod-1',
        quantity: 3,
        replaceQuantity: true,
      }),
    );
    await waitFor(() => expect(within(group).getByText('3')).toBeInTheDocument());
  });

  it('disables checkout when the cart is empty', async () => {
    getMock.mockResolvedValueOnce(
      createCartResponse(
        buildCart({
          items: [],
          subtotalPaise: 0,
          grandPaise: 0,
        }),
      ),
    );

    render(
      <MemoryRouter initialEntries={['/cart']}>
        <CartPage />
      </MemoryRouter>,
    );

    const button = await screen.findByRole('button', { name: /proceed to checkout/i });
    expect(button).toBeDisabled();
    expect(screen.getByText(/your cart is empty/i)).toBeInTheDocument();
  });
});
