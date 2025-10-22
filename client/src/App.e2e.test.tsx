import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { RouterProvider, createMemoryRouter } from 'react-router-dom';
import { configureStore } from '@reduxjs/toolkit';
import type { Store } from '@reduxjs/toolkit';
import { act } from 'react-dom/test-utils';
import ThemeProvider from '@/theme/ThemeProvider';
import { AppRoutes } from '@/App';
import { paths } from '@/routes/paths';
import authReducer from '@/store/slices/authSlice';
import cartReducer from '@/store/slices/cartSlice';
import productReducer from '@/store/slices/productSlice';
import settingsReducer from '@/store/slices/settingsSlice';
import adminReducer from '@/store/slices/adminSlice';
import shopsReducer from '@/store/shops';
import eventsReducer from '@/store/events.slice';
import catalogReducer from '@/store/products';
import verifiedReducer from '@/store/verified';
import notifsReducer from '@/store/notifs';
import ordersReducer from '@/store/orders';
import userProfileReducer from '@/store/user';
import { injectStore } from '@/lib/http';

vi.mock('@/config/api', () => ({ API_BASE: 'https://api.test/' }));

const httpGetMock = vi.fn();
const httpPostMock = vi.fn(() => Promise.resolve({ data: {} }));
const httpPatchMock = vi.fn(() => Promise.resolve({ data: {} }));
const httpDeleteMock = vi.fn(() => Promise.resolve({ data: {} }));

vi.mock('@/lib/http', () => ({
  http: {
    get: httpGetMock,
    post: httpPostMock,
    patch: httpPatchMock,
    delete: httpDeleteMock,
  },
  adminHttp: {
    get: vi.fn(() => Promise.resolve({ data: {} })),
    post: vi.fn(() => Promise.resolve({ data: {} })),
    patch: vi.fn(() => Promise.resolve({ data: {} })),
    delete: vi.fn(() => Promise.resolve({ data: {} })),
  },
  injectStore: vi.fn(),
}));

const createResponse = (data: unknown) => ({ data });

const createPaginatedEventsResponse = (items: any[]) =>
  createResponse({
    data: {
      items,
      total: items.length,
      page: 1,
      pageSize: Math.max(items.length, 1),
    },
  });

type GetHandler = (config?: any) => Promise<any>;

type HandlerMap = Record<string, GetHandler>;

const defaultShops = [
  {
    _id: 'shop-1',
    id: 'shop-1',
    name: 'Arcade Alley',
    category: 'Gaming',
    location: 'Neo City',
    banner: null,
    logo: null,
    image: null,
    ratingAvg: 4.8,
    distance: 0.5,
    isOpen: true,
  },
];

const defaultProducts = [
  {
    _id: 'prod-1',
    id: 'prod-1',
    name: 'Power Drink',
    pricePaise: 19900,
    image: null,
    shopId: 'shop-1',
    shop: { _id: 'shop-1', name: 'Arcade Alley' },
    available: true,
    isActive: true,
  },
];

const defaultEvents = [
  {
    _id: 'event-1',
    title: 'Arcade Championship',
    type: 'tournament',
    category: 'gaming',
    format: 'single_match',
    teamSize: 1,
    maxParticipants: 32,
    registeredCount: 10,
    registrationOpenAt: new Date().toISOString(),
    registrationCloseAt: new Date(Date.now() + 86400000).toISOString(),
    startAt: new Date(Date.now() + 172800000).toISOString(),
    endAt: new Date(Date.now() + 259200000).toISOString(),
    status: 'published',
    mode: 'online',
    visibility: 'public',
    bannerUrl: null,
  },
];

const defaultVerified = [
  {
    _id: 'verified-1',
    name: 'Pro Gamer',
    status: 'approved',
    category: 'Esports',
    avatar: null,
  },
];

const defaultUser = {
  id: 'user-1',
  name: 'Test User',
  phone: '0000000000',
  role: 'customer' as const,
  location: 'Neo City',
  address: '123 Arcade Street',
  isVerified: true,
  verificationStatus: 'approved' as const,
};

const defaultOrders = [
  {
    _id: 'order-1',
    status: 'delivered',
    createdAt: new Date('2024-01-02T09:00:00Z').toISOString(),
    updatedAt: new Date('2024-01-02T09:00:00Z').toISOString(),
    customer: { _id: 'user-1', name: 'Test User' },
    shop: { _id: 'shop-1', name: 'Arcade Alley' },
    items: [
      {
        _id: 'order-1-item-1',
        name: 'Energy Drink',
        quantity: 2,
        price: 9900,
      },
    ],
    totals: {
      subtotal: 19800,
      discount: 0,
      tax: 0,
      shipping: 0,
      total: 19800,
    },
  },
];

const baseHandlers: HandlerMap = {
  '/admin/messages': () => Promise.resolve(createResponse({ data: [] })),
  '/shops': () => Promise.resolve(createResponse({ data: defaultShops })),
  '/verified': () => Promise.resolve(createResponse({ data: defaultVerified })),
  '/special': () => Promise.resolve(createResponse({ data: defaultProducts })),
  '/notifications': () =>
    Promise.resolve(
      createResponse({
        data: {
          items: [],
          hasMore: false,
          unread: 0,
        },
      }),
    ),
  '/events': () => Promise.resolve(createPaginatedEventsResponse(defaultEvents)),
  '/auth/me': () => Promise.resolve(createResponse({ data: defaultUser })),
  '/orders/mine': () => Promise.resolve(createResponse({ data: defaultOrders })),
};

const normalizeKey = (url: unknown): string => {
  if (typeof url === 'string') {
    return url.startsWith('/') ? url : `/${url}`;
  }
  if (url && typeof url === 'object' && 'url' in (url as Record<string, unknown>)) {
    const raw = (url as { url?: unknown }).url;
    return normalizeKey(raw);
  }
  return '/unknown';
};

const setupHttpHandlers = (overrides: Partial<HandlerMap> = {}) => {
  httpGetMock.mockImplementation((url, config) => {
    const key = normalizeKey(url);
    const handler = overrides[key] || baseHandlers[key];
    if (!handler) {
      throw new Error(`Unhandled GET request for ${key}`);
    }
    return handler(config);
  });
};

const createTestStore = (): Store => {
  const store = configureStore({
    reducer: {
      auth: authReducer,
      cart: cartReducer,
      products: productReducer,
      settings: settingsReducer,
      admin: adminReducer,
      shops: shopsReducer,
      events: eventsReducer,
      catalog: catalogReducer,
      verified: verifiedReducer,
      notifs: notifsReducer,
      orders: ordersReducer,
      userProfile: userProfileReducer,
    },
  });

  injectStore(store);
  return store;
};

const renderApp = (store: Store, initialEntries: string[]) => {
  const router = createMemoryRouter(
    [
      {
        path: '*',
        element: <AppRoutes />,
      },
    ],
    { initialEntries },
  );

  return render(
    <Provider store={store}>
      <ThemeProvider>
        <RouterProvider router={router} />
      </ThemeProvider>
    </Provider>,
  );
};

beforeEach(() => {
  httpGetMock.mockReset();
  httpPostMock.mockClear();
  httpPatchMock.mockClear();
  httpDeleteMock.mockClear();
  localStorage.setItem('token', 'test-token');
});

afterEach(() => {
  document.getElementById('app-toast-container')?.remove();
});


describe('App customer flows', () => {
  it('renders shop cards on the home page without add-to-cart controls', async () => {
    setupHttpHandlers();
    const store = createTestStore();
    renderApp(store, ['/home']);

    const heading = await screen.findByRole('heading', { name: /featured shops/i });
    const section = heading.closest('.section') as HTMLElement;
    expect(section).toBeTruthy();

    const viewButtons = within(section).getAllByRole('button', { name: /view shop/i });
    expect(viewButtons.length).toBeGreaterThan(0);
    expect(within(section).queryByText(/add to cart/i)).toBeNull();
  });

  it('displays the events skeleton before rendering event cards on first load', async () => {
    let resolveEvents: ((value: any) => void) | undefined;
    const eventsPromise = new Promise((resolve) => {
      resolveEvents = resolve;
    });

    setupHttpHandlers({
      '/events': () => eventsPromise,
    });

    const store = createTestStore();
    const { container } = renderApp(store, ['/events']);

    expect(container.querySelector('.event-list')).toBeTruthy();

    await act(async () => {
      resolveEvents?.(createPaginatedEventsResponse(defaultEvents));
      await eventsPromise;
    });

    const heading = await screen.findByRole('heading', { name: /events & tournaments/i });
    expect(heading).toBeInTheDocument();
    expect(screen.getByText('Arcade Championship')).toBeInTheDocument();
  });

  it('increments the header cart badge immediately after adding a product', async () => {
    setupHttpHandlers();
    const store = createTestStore();
    const { container } = renderApp(store, ['/home']);
    const user = userEvent.setup();

    const topHeader = container.querySelector('.top-header') as HTMLElement;
    expect(topHeader).toBeTruthy();

    const cartButton = within(topHeader!).getByLabelText('Cart');
    expect(within(cartButton).getByText(/0 items in cart/i)).toBeInTheDocument();

    const productsHeading = await screen.findByRole('heading', { name: /special shop products/i });
    const productsSection = productsHeading.closest('.section') as HTMLElement;
    expect(productsSection).toBeTruthy();

    const addButtons = within(productsSection!).getAllByRole('button', { name: /add to cart/i });
    expect(addButtons.length).toBeGreaterThan(0);

    await user.click(addButtons[0]);

    await waitFor(() => {
      expect(within(cartButton).getByText(/1 item in cart/i)).toBeInTheDocument();
    });
  });

  it('navigates between profile, orders, and shops without stale content', async () => {
    setupHttpHandlers();
    const store = createTestStore();
    const user = userEvent.setup();

    renderApp(store, ['/profile']);

    await screen.findByRole('heading', { name: /profile overview/i });
    expect(screen.getByText(/manage how your information appears/i)).toBeInTheDocument();

    const ordersLinks = screen.getAllByLabelText(/my orders/i);
    await user.click(ordersLinks[0]!);

    await screen.findByRole('heading', { name: /my orders/i });
    expect(screen.getByText(/track your recent purchases/i)).toBeInTheDocument();
    expect(screen.queryByText(/manage how your information appears/i)).not.toBeInTheDocument();

    const shopsButtons = screen.getAllByRole('button', { name: /shops/i });
    await user.click(shopsButtons[0]!);

    await screen.findByRole('heading', { name: /explore shops/i });
    expect(screen.queryByRole('heading', { name: /my orders/i })).not.toBeInTheDocument();

    await user.click(screen.getAllByLabelText(/my orders/i)[0]!);
    await screen.findByRole('heading', { name: /my orders/i });
    expect(screen.queryByRole('heading', { name: /explore shops/i })).not.toBeInTheDocument();
  });

  it('lets a user add voice parsed items to the cart and proceed to checkout', async () => {
    const tomatoProduct = {
      _id: 'prod-tomato',
      name: 'Tomato',
      price: 45,
      image: 'tomato.jpg',
      shop: { _id: 'shop-1', name: 'Arcade Alley' },
    };
    const okraProduct = {
      _id: 'prod-okra',
      name: 'Okra',
      price: 60,
      image: 'okra.jpg',
      shop: { _id: 'shop-2', name: 'Green Basket' },
    };

    setupHttpHandlers({
      '/products': (config) => {
        const query = String(config?.params?.q ?? '').toLowerCase();
        if (query.includes('tomato')) {
          return Promise.resolve(createResponse({ data: [tomatoProduct] }));
        }
        if (query.includes('benda') || query.includes('okra')) {
          return Promise.resolve(createResponse({ data: [okraProduct] }));
        }
        return Promise.resolve(createResponse({ data: [] }));
      },
    });

    const store = createTestStore();
    const user = userEvent.setup();

    renderApp(store, ['/voice-order']);

    await screen.findByRole('heading', { name: /voice order/i });

    const manualInput = screen.getByLabelText(/prefer typing/i);
    await user.type(manualInput, 'oka kilo tomatolu');
    await user.click(screen.getByRole('button', { name: /parse text/i }));

    await screen.findByText('Arcade Alley');
    await user.click(screen.getByRole('button', { name: /add to cart/i }));

    await waitFor(() => {
      expect(screen.getByText(/1 items/i)).toBeInTheDocument();
      expect(screen.getByText(/₹\s?45\.00/)).toBeInTheDocument();
    });

    await user.clear(manualInput);
    await user.type(manualInput, '2 kg bendakayalu');
    await user.click(screen.getByRole('button', { name: /parse text/i }));

    await screen.findByText('Green Basket');
    const addButtons = screen.getAllByRole('button', { name: /add to cart/i });
    await user.click(addButtons[0]!);

    await waitFor(() => {
      expect(screen.getByText(/3 items/i)).toBeInTheDocument();
      expect(screen.getByText(/₹\s?105\.00/)).toBeInTheDocument();
    });

    const originalLocation = window.location;
    const assignSpy = vi.fn();
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...originalLocation, assign: assignSpy },
    });

    await user.click(screen.getByRole('button', { name: /proceed to checkout/i }));
    expect(assignSpy).toHaveBeenCalledWith(paths.checkout());

    Object.defineProperty(window, 'location', {
      configurable: true,
      value: originalLocation,
    });
  });
});

