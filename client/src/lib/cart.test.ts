import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest';
import { toCartItem, buildCartItemPayload } from './cart';

describe('cart helpers', () => {
  it('normalizes various product shapes into cart items', () => {
    const response = {
      productId: 'res-123',
      pricePaise: 2500,
      shopId: 'shop-res',
      product: { id: 'res-123', name: 'Response product', image: 'res.jpg' },
    };

    const product = {
      id: 'prod-456',
      shop: { _id: 'shop-456' },
      price: 99.5,
      title: 'Product title',
      images: ['image-a.jpg', 'image-b.jpg'],
    };

    const item = toCartItem(product, 2, response);

    expect(item).toMatchObject({
      productId: 'prod-456',
      shopId: 'shop-456',
      name: 'Product title',
      qty: 2,
      pricePaise: 9950,
      image: 'image-a.jpg',
    });
  });

  it('preserves variant identifiers when present', () => {
    const product = {
      id: 'prod-1',
      shopId: 'shop-1',
      price: 50,
      name: 'Variant product',
      variantId: 'var-99',
    };

    const item = toCartItem(product, 1);

    expect(item.variantId).toBe('var-99');
  });

  describe('buildCartItemPayload', () => {
    let consoleSpy: MockInstance<
      Parameters<typeof console.error>,
      ReturnType<typeof console.error>
    >;

    beforeEach(() => {
      consoleSpy = vi
        .spyOn(console, 'error')
        .mockImplementation((..._args: Parameters<typeof console.error>) => {
          return undefined;
        });
    });

    afterEach(() => {
      consoleSpy.mockRestore();
    });

    it('returns null payload and logs when normalization fails', () => {
      const payload = buildCartItemPayload({
        product: { name: 'Invalid product' },
        quantity: 1,
      });

      expect(payload).toBeNull();
      expect(consoleSpy).toHaveBeenCalled();
    });
  });
});
