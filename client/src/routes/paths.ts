export const paths = {
  root: () => '/',
  landing: () => '/',
  home: () => '/home',
  cart: () => '/cart',
  checkout: () => '/checkout',
  notifications: () => '/notifications',
  profile: () => '/profile',
  settings: () => '/settings',
  shops: () => '/shops',
  shop: (id: string = ':id') => `/shops/${id}`,
  specialShop: () => '/special-shop',
  voiceOrder: () => '/voice-order',
  services: {
    catalog: () => '/services',
    requests: () => '/services/requests',
    requestsMine: () => '/services/requests/mine',
    detail: (id: string = ':id') => `/services/${id}`,
    request: () => '/services/request',
  },
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
    mine: () => '/orders/mine',
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
    services: () => '/admin/services',
    serviceRequests: () => '/admin/service-requests',
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
