import { describe, expect, it } from 'vitest';
import { adaptProduct } from '../api';

const baseProduct = {
  _id: 'p-1',
  name: 'Tomato',
  price: 35,
  image: 'tomato.jpg',
  shop: {
    _id: 's-1',
    name: 'Fresh Greens',
  },
};

describe('voice order product adapter', () => {
  it('normalizes rupee prices into paise', () => {
    const adapted = adaptProduct(baseProduct);
    expect(adapted).toEqual(
      expect.objectContaining({
        id: 'p-1',
        name: 'Tomato',
        shopId: 's-1',
        shopName: 'Fresh Greens',
        pricePaise: 3500,
        image: 'tomato.jpg',
      }),
    );
  });

  it('falls back gracefully when shop info is missing', () => {
    const adapted = adaptProduct({ ...baseProduct, shop: null, shopId: 'shop-42' });
    expect(adapted).toEqual(
      expect.objectContaining({
        shopId: 'shop-42',
        shopName: 'Shop shop-42',
      }),
    );
  });

  it('returns null for invalid payloads', () => {
    expect(adaptProduct({})).toBeNull();
  });
});
