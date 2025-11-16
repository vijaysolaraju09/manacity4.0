import { describe, expect, it } from 'vitest';
import { normalizeShopProduct } from './shops';

describe('normalizeShopProduct', () => {
  it('uses id fallback when _id is missing', () => {
    const result = normalizeShopProduct({ id: 42, name: 'Test', pricePaise: 100 });
    expect(result._id).toBe('42');
    expect(result.id).toBe('42');
  });

  it('extracts nested identifiers from product references', () => {
    const result = normalizeShopProduct(
      {
        product: { _id: 'abc123' },
        name: 'Nested',
        pricePaise: 200,
      },
      { shopId: 'shop-1' },
    );
    expect(result._id).toBe('abc123');
    expect(result.shopId).toBe('shop-1');
  });

  it('throws when unable to resolve an identifier', () => {
    expect(() => normalizeShopProduct({ name: 'Invalid', pricePaise: 300 })).toThrow(
      /Product identifier is missing/i,
    );
  });
});
