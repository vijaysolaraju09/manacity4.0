import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';

const postMock = vi.fn();
const requestUseMock = vi.fn();

vi.mock('axios', () => {
  const create = vi.fn(() => ({
    post: postMock,
    interceptors: { request: { use: requestUseMock } },
  }));
  return { default: { create }, create };
});

const toItemMock = vi.fn((response: any) => response.data.order);
vi.mock('@/lib/response', async () => {
  const actual = await vi.importActual<typeof import('@/lib/response')>('@/lib/response');
  return { ...actual, toItem: (response: any) => toItemMock(response) };
});

const normalizeOrderMock = vi.fn((order: any) => ({ ...order, normalized: true }));
vi.mock('@/store/orders', async () => {
  const actual = await vi.importActual<typeof import('@/store/orders')>('@/store/orders');
  return { ...actual, normalizeOrder: (order: any) => normalizeOrderMock(order) };
});

import { createOrder } from '@/api/orders';

const clearMocks = (...mocks: Mock[]) => {
  mocks.forEach((mock) => mock.mockReset());
};

describe('orders api', () => {
  beforeEach(() => {
    clearMocks(postMock, requestUseMock, toItemMock, normalizeOrderMock);
    postMock.mockResolvedValue({ data: { order: { id: 'order-1', items: [] } } });
  });

  it('sanitizes payload and posts to /orders', async () => {
    const result = await createOrder({
      shopId: ' shop-42 ',
      items: [
        { productId: 'item-1', quantity: 2 },
        { productId: '  item-2  ', quantity: -3 },
        { productId: 'item-3', quantity: 1.8 },
        { productId: '', quantity: 5 },
      ],
    });

    expect(postMock).toHaveBeenCalledTimes(1);
    expect(postMock).toHaveBeenCalledWith('/orders', {
      shopId: 'shop-42',
      items: [
        { productId: 'item-1', quantity: 2 },
        { productId: 'item-2', quantity: 1 },
        { productId: 'item-3', quantity: 1 },
      ],
    });

    expect(toItemMock).toHaveBeenCalled();
    expect(normalizeOrderMock).toHaveBeenCalledWith({ id: 'order-1', items: [] });
    expect(result).toEqual({ id: 'order-1', items: [], normalized: true });
  });

  it('throws when shop id is missing', async () => {
    await expect(
      createOrder({ shopId: ' ', items: [{ productId: 'p1', quantity: 1 }] }),
    ).rejects.toThrow('Shop is required to place an order');
    expect(postMock).not.toHaveBeenCalled();
  });

  it('throws when no valid items are provided', async () => {
    await expect(createOrder({ shopId: 's1', items: [] })).rejects.toThrow(
      'At least one product is required to place an order',
    );
    expect(postMock).not.toHaveBeenCalled();
  });
});
