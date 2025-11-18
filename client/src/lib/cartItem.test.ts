import { describe, expect, it } from 'vitest';
import { buildCartItem } from './cartItem';

describe('buildCartItem', () => {
  it('accepts products from product pages that expose id but not _id', () => {
    const item = buildCartItem({
      product: {
        id: 'prod-page-1',
        shop: 'shop-1',
        name: 'Mango Shake',
        price: 150,
      },
      quantity: 2,
    });

    expect(item).toEqual(
      expect.objectContaining({
        productId: 'prod-page-1',
        shopId: 'shop-1',
        qty: 2,
      }),
    );
  });

  it('accepts products from shop cards that expose an _id', () => {
    const item = buildCartItem({
      product: {
        _id: 'shop-card-9',
        shopId: 'shop-99',
        name: 'Cold Coffee',
        pricePaise: 9900,
      },
      quantity: 1,
    });

    expect(item).toEqual(
      expect.objectContaining({
        productId: 'shop-card-9',
        shopId: 'shop-99',
        pricePaise: 9900,
        qty: 1,
      }),
    );
  });
});
