import { describe, expect, it, beforeEach, afterEach, vi, type MockInstance } from 'vitest';

import cartReducer, {
  addItem,
  clearCart,
  clearShop,
  hydrateCart,
  removeItem,
  selectCartItems,
  selectByShop,
  selectItemCount,
  selectSubtotalPaise,
  updateItemQty,
  type CartItem,
  type CartState,
} from './cartSlice';
import type { RootState } from '@/store';

describe('cartSlice', () => {
  const baseItem: CartItem = {
    productId: 'p-1',
    shopId: 's-1',
    name: 'Sample item',
    pricePaise: 2500,
    qty: 1,
  };

  let setItemSpy: MockInstance<Parameters<Storage['setItem']>, ReturnType<Storage['setItem']>>;

  const wrapState = (state: CartState) => ({ cart: state } as unknown as RootState);

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-01T00:00:00.000Z'));
    localStorage.clear();
    setItemSpy = vi.spyOn(Storage.prototype, 'setItem');
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    setItemSpy.mockRestore();
  });

  it('adds new items and persists them', () => {
    const state = cartReducer(undefined, addItem(baseItem));
    expect(state.items).toHaveLength(1);
    expect(state.items[0]).toMatchObject({ productId: 'p-1', qty: 1, pricePaise: 2500 });

    vi.runAllTimers();
    expect(setItemSpy).toHaveBeenLastCalledWith(
      'manacity:cart:v2',
      JSON.stringify(state.items),
    );
  });

  it('merges existing items by product, shop and variant', () => {
    const state = [
      addItem(baseItem),
      addItem({ ...baseItem, qty: 3, pricePaise: 3000, name: 'Updated', image: 'image.jpg' }),
    ].reduce(cartReducer, undefined as unknown as CartState);

    expect(state.items).toHaveLength(1);
    expect(state.items[0]).toMatchObject({ qty: 4, pricePaise: 3000, name: 'Updated', image: 'image.jpg' });
  });

  it('keeps separate lines for different shops or variants', () => {
    const actions = [
      addItem(baseItem),
      addItem({ ...baseItem, shopId: 's-2' }),
      addItem({ ...baseItem, variantId: 'v-1', qty: 2 }),
    ];
    const state = actions.reduce(cartReducer, undefined as unknown as CartState);

    expect(state.items).toHaveLength(3);
  });

  it('updates quantities and removes invalid entries', () => {
    const withItem = cartReducer(undefined, addItem(baseItem));
    const updated = cartReducer(withItem, updateItemQty({ productId: 'p-1', shopId: 's-1', qty: 5.6 }));
    expect(selectCartItems(wrapState(updated))[0].qty).toBe(5);

    const removed = cartReducer(updated, updateItemQty({ productId: 'p-1', shopId: 's-1', qty: 0 }));
    expect(removed.items).toHaveLength(0);
  });

  it('removes items explicitly and supports shop level clearing', () => {
    const populated = [
      addItem(baseItem),
      addItem({ ...baseItem, productId: 'p-2', shopId: 's-2' }),
    ].reduce(cartReducer, undefined as unknown as CartState);

    const removed = cartReducer(populated, removeItem({ productId: 'p-1', shopId: 's-1' }));
    expect(removed.items).toHaveLength(1);
    expect(removed.items[0].productId).toBe('p-2');

    const clearedShop = cartReducer(removed, clearShop({ shopId: 's-2' }));
    expect(clearedShop.items).toHaveLength(0);
  });

  it('clears the entire cart', () => {
    const populated = [addItem(baseItem), addItem({ ...baseItem, productId: 'p-2' })].reduce(
      cartReducer,
      undefined as unknown as CartState,
    );

    const cleared = cartReducer(populated, clearCart());
    expect(cleared.items).toHaveLength(0);
  });

  it('hydrates from existing data safely', () => {
    const hydrated = cartReducer(undefined, hydrateCart([{ ...baseItem, qty: 3 }, { productId: ' ', shopId: 's-3', name: 'x', qty: 1, pricePaise: 1000 }]));
    expect(hydrated.items).toHaveLength(1);
    expect(hydrated.items[0]).toMatchObject({ productId: 'p-1', qty: 3 });
  });

  it('keeps selectors consistent', () => {
    const actions = [
      addItem(baseItem),
      addItem({ ...baseItem, productId: 'p-2', shopId: 's-2', pricePaise: 1500, qty: 2 }),
      updateItemQty({ productId: 'p-1', shopId: 's-1', qty: 4 }),
    ];
    const state = actions.reduce(cartReducer, undefined as unknown as CartState);
    const root = wrapState(state);

    expect(selectItemCount(root)).toBe(6);
    expect(selectSubtotalPaise(root)).toBe(4 * 2500 + 2 * 1500);
    expect(selectByShop('s-1')(root)).toHaveLength(1);
    expect(selectByShop('s-2')(root)[0]).toMatchObject({ productId: 'p-2', qty: 2 });
  });
});
