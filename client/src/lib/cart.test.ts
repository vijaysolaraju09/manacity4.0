import { describe, expect, it } from 'vitest';
import { toCartItem } from './cart';

describe('toCartItem', () => {
  it('normalizes the provided product and quantity', () => {
    const item = toCartItem(
      {
        productId: 'p-1',
        shopId: 's-1',
        name: 'Fresh Apples',
        pricePaise: 9900,
        image: 'apple.png',
      },
      3.9,
    );

    expect(item).toEqual({
      productId: 'p-1',
      shopId: 's-1',
      name: 'Fresh Apples',
      pricePaise: 9900,
      qty: 3,
      image: 'apple.png',
    });
  });

  it('derives identifiers, price and name from response fallbacks', () => {
    const item = toCartItem(
      {
        id: 123,
        price: 199.5,
        images: ['client.png'],
      },
      1,
      {
        shopId: 'server-shop',
        productId: 'server-product',
        name: 'Server Name',
        pricePaise: 19999,
        product: {
          title: 'Server Product',
          image: 'server.png',
        },
        shop: { id: 'fallback-shop' },
      },
    );

    expect(item).toEqual({
      productId: 'server-product',
      shopId: 'server-shop',
      name: 'Server Name',
      pricePaise: 19999,
      qty: 1,
      image: 'client.png',
    });
  });

  it('throws descriptive errors when required data is missing', () => {
    expect(() => toCartItem({} as any, 1)).toThrow('Missing product id');
    expect(() =>
      toCartItem({ productId: 'p-1' } as any, 1),
    ).toThrow('Missing shop id');
    expect(() =>
      toCartItem({ productId: 'p-1', shopId: 's-1' } as any, 1),
    ).toThrow('Missing product price');
  });
});
