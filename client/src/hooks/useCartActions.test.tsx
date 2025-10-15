import { describe, expect, it } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import type { ReactNode } from 'react';
import cartReducer, {
  selectCartItems,
  selectItemCount,
  selectSubtotalPaise,
} from '@/store/slices/cartSlice';
import type { RootState } from '@/store';
import { useCartActions } from './useCartActions';

const createStore = () =>
  configureStore({
    reducer: {
      cart: cartReducer,
    },
  });

describe('useCartActions', () => {
  const baseProduct = {
    _id: 'prod-1',
    shopId: 'shop-1',
    price: 199.99,
    name: 'Sample product',
    image: 'sample.jpg',
  };

  it('adds items to the cart and merges duplicate products', () => {
    const store = createStore();
    const wrapper = ({ children }: { children: ReactNode }) => (
      <Provider store={store}>{children}</Provider>
    );

    const { result } = renderHook(() => useCartActions(), { wrapper });

    act(() => {
      result.current.addToCart(baseProduct, 1);
      result.current.addToCart(
        { ...baseProduct, name: 'Updated name', image: 'updated.jpg' },
        2,
      );
    });

    const state = store.getState() as RootState;
    const items = selectCartItems(state);

    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      productId: 'prod-1',
      shopId: 'shop-1',
      qty: 3,
      name: 'Updated name',
      image: 'updated.jpg',
      pricePaise: 19999,
    });
    expect(selectItemCount(state)).toBe(3);
    expect(selectSubtotalPaise(state)).toBe(3 * 19999);
  });

  it('throws when the product cannot be normalized into a cart item', () => {
    const store = createStore();
    const wrapper = ({ children }: { children: ReactNode }) => (
      <Provider store={store}>{children}</Provider>
    );

    const { result } = renderHook(() => useCartActions(), { wrapper });

    expect(() => result.current.addToCart({ price: 99 })).toThrowError();
    expect(selectCartItems(store.getState() as RootState)).toHaveLength(0);
  });
});
