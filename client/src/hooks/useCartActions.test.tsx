import { Provider } from 'react-redux';
import { renderHook, act } from '@testing-library/react';

import { store } from '@/store';
import { useCartActions } from './useCartActions';
import { selectCartItems } from '@/store/slices/cartSlice';

describe('useCartActions', () => {
  const wrapper = ({ children }: { children: React.ReactNode }) => <Provider store={store}>{children}</Provider>;

  it('adds items to the cart', () => {
    const { result } = renderHook(() => useCartActions(), { wrapper });

    act(() => {
      result.current.addToCart({
        _id: 'sku-1',
        shopId: 'shop-1',
        name: 'Fresh Apples',
        pricePaise: 999,
      });
    });

    const items = selectCartItems(store.getState());
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ productId: 'sku-1', qty: 1, pricePaise: 999 });
  });

  it('updates and removes cart items', () => {
    const { result } = renderHook(() => useCartActions(), { wrapper });

    act(() => {
      result.current.addToCart({ _id: 'sku-2', shopId: 'shop-1', name: 'Bananas', price: 49 }, 2);
    });

    act(() => {
      result.current.updateCartQuantity({ productId: 'sku-2', shopId: 'sku-2', qty: 5 });
    });

    let items = selectCartItems(store.getState());
    expect(items.find((item) => item.productId === 'sku-2')?.qty).toBe(5);

    act(() => {
      result.current.removeFromCart({ productId: 'sku-2', shopId: 'sku-2' });
    });

    items = selectCartItems(store.getState());
    expect(items.find((item) => item.productId === 'sku-2')).toBeUndefined();
  });
});
