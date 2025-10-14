import type { AxiosRequestConfig } from 'axios';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockPost = vi.fn();

let requestInterceptor: ((config: AxiosRequestConfig) => AxiosRequestConfig) | null = null;

vi.mock('axios', () => {
  return {
    default: {
      create: vi.fn(() => ({
        post: mockPost,
        interceptors: {
          request: {
            use: (
              handler: (config: AxiosRequestConfig) => AxiosRequestConfig,
            ) => {
              requestInterceptor = handler;
              return 0;
            },
          },
        },
      })),
    },
  };
});

import { createOrder } from './orders';

describe('createOrder', () => {
  beforeEach(() => {
    mockPost.mockReset();
    requestInterceptor = null;
    localStorage.clear();
  });

  it('sends the expected payload and attaches the auth token', async () => {
    const now = new Date().toISOString();
    let capturedConfig: AxiosRequestConfig | null = null;
    mockPost.mockImplementation(async (_url, _body, config: AxiosRequestConfig = {}) => {
      const finalConfig = requestInterceptor
        ? requestInterceptor(config)
        : config;
      capturedConfig = finalConfig;
      return {
        data: {
          ok: true,
          data: {
            order: {
              _id: 'order-1',
              status: 'pending',
              type: 'product',
              items: [],
              fulfillment: { type: 'pickup' },
              itemsTotal: 0,
              discountTotal: 0,
              taxTotal: 0,
              shippingFee: 0,
              grandTotal: 0,
              createdAt: now,
              updatedAt: now,
              shop: 'shop-1',
              user: 'user-1',
              shopSnapshot: { name: 'Tasty Treats', location: 'MG Road', address: 'MG Road' },
              userSnapshot: { name: 'Alice', phone: '9999999999', location: 'MG Road', address: 'MG Road' },
              timeline: [],
            },
          },
        },
      };
    });

    localStorage.setItem('token', 'jwt-token');

    const order = await createOrder({
      shopId: 'shop-1',
      items: [{ productId: 'prod-1', quantity: 2 }],
      notes: 'Less sugar',
      addressId: 'addr-9',
    });

    expect(mockPost).toHaveBeenCalledWith(
      '/orders',
      {
        shopId: 'shop-1',
        items: [{ productId: 'prod-1', quantity: 2 }],
        fulfillment: { type: 'pickup' },
        notes: 'Less sugar',
        addressId: 'addr-9',
      },
      expect.any(Object),
    );

    expect(capturedConfig?.headers?.Authorization).toBe('Bearer jwt-token');
    expect(order.status).toBe('pending');
    expect(order.totals.grand).toBe(0);
  });

  it('surfaces API errors to the caller', async () => {
    const apiError = new Error('Invalid order');
    (apiError as any).response = { data: { message: 'Invalid order payload' } };
    mockPost.mockRejectedValueOnce(apiError);

    await expect(
      createOrder({
        shopId: 'shop-1',
        items: [{ productId: 'prod-1', quantity: 1 }],
      }),
    ).rejects.toMatchObject({ response: { data: { message: 'Invalid order payload' } } });
  });
});
