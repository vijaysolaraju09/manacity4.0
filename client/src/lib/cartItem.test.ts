import { buildCartItem } from './cartItem';

describe('buildCartItem', () => {
  it('normalizes identifiers, quantities and price fields', () => {
    const item = buildCartItem({
      product: {
        _id: ' product-1 ',
        shopId: ' shop-1 ',
        name: 'Premium Mango',
        price: 249.5,
        images: ['https://cdn.test/mango.jpg'],
      },
      quantity: 2.4,
    });

    expect(item).toEqual({
      productId: 'product-1',
      shopId: 'shop-1',
      name: 'Premium Mango',
      image: 'https://cdn.test/mango.jpg',
      pricePaise: 24950,
      qty: 2,
      variantId: undefined,
    });
  });

  it('supports alternative field names and falls back to defaults', () => {
    const item = buildCartItem({
      product: {
        id: 'sku-9',
        shop: { id: 'vendor-3' },
        title: 'Organic Tomatoes',
        sellingPricePaise: 1299,
        media: [{ url: 'https://cdn.test/tomato.png' }],
        variant: { _id: 'var-1' },
      },
      quantity: 1,
    });

    expect(item).toEqual({
      productId: 'sku-9',
      shopId: 'vendor-3',
      name: 'Organic Tomatoes',
      image: 'https://cdn.test/tomato.png',
      pricePaise: 1299,
      qty: 1,
      variantId: 'var-1',
    });
  });

  it('throws when the product cannot be normalized', () => {
    expect(() => buildCartItem({ product: null, quantity: 1 })).toThrow('Cannot add an unknown product to cart');
    expect(() => buildCartItem({ product: {}, quantity: 1 })).toThrow('Product is missing a valid identifier');
  });
});
