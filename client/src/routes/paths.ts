export const paths = {
  root: () => '/',
  landing: () => '/',
  home: () => '/home',
  cart: () => '/cart',
  notifications: () => '/notifications',
  profile: () => '/profile',
  settings: () => '/settings',
  shops: () => '/shops',
  specialShop: () => '/special-shop',
  voiceOrder: () => '/voice-order',
  verified: () => '/verified',
  verifiedUsers: {
    list: () => '/verified-users',
    detail: (id: string = ':id') => `/verified-users/${id}`,
  },
  products: {
    list: () => '/products',
    detail: (id: string = ':id') => `/product/${id}`,
    special: () => '/special-shop',
  },
  orders: {
    root: () => '/orders',
    mine: () => '/orders/my',
    received: () => '/orders/received',
    service: () => '/orders/service',
    detail: (orderId: string = ':id') => `/orders/${orderId}`,
  },
  auth: {
    login: () => '/login',
    signup: () => '/signup',
  },
  admin: {
    root: () => '/admin',
    login: () => '/admin/login',
    requests: {
      business: () => '/admin/requests/business',
      verification: () => '/admin/requests/verification',
    },
    shops: () => '/admin/shops',
    products: () => '/admin/products',
    events: () => '/admin/events',
    users: () => '/admin/users',
    analytics: () => '/admin/analytics',
  },
  events: {
    list: () => '/events',
    detail: (eventId: string = ':id') => `/events/${eventId}`,
  },
  verification: {
    requests: () => '/verification-requests',
  },
  manageProducts: () => '/manage-products',
};

export type Paths = typeof paths;
