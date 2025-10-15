import cartReducer, {
  addItem,
  clearCart,
  clearShop,
  removeItem,
  selectCartItems,
  selectByShop,
  selectItemCount,
  selectSubtotalPaise,
  updateQty,
} from './cartSlice';
import type { CartItem, CartState } from './cartSlice';
import type { RootState } from '@/store';
import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';

describe('cartSlice reducers', () => {
  const baseItem: CartItem = {
    productId: 'p-1',
    shopId: 's-1',
    name: 'Sample',
    pricePaise: 2500,
    qty: 1,
  };

  let setItemSpy: ReturnType<typeof vi.spyOn>;

  const getState = (state: CartState) => ({ cart: state } as unknown as RootState);

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

  it('adds a brand new item and persists the cart', () => {
    const state = cartReducer(undefined, addItem(baseItem));

    expect(state.items).toHaveLength(1);
    expect(state.items[0]).toMatchObject({
      productId: 'p-1',
      shopId: 's-1',
      qty: 1,
      name: 'Sample',
      pricePaise: 2500,
    });
    expect(state.lastUpdated).toBeGreaterThan(0);

    vi.runAllTimers();
    expect(setItemSpy).toHaveBeenLastCalledWith(
      'manacity_cart_items',
      JSON.stringify(state.items),
    );
  });

  it('merges quantities and details when the product already exists', () => {
    let state = cartReducer(undefined, addItem(baseItem));

    const updatedState = cartReducer(
      state,
      addItem({
        ...baseItem,
        qty: 3.6,
        name: 'Updated name',
        image: 'image.png',
        pricePaise: 4000,
        shopId: 's-2',
      }),
    );

    expect(updatedState.items).toHaveLength(1);
    expect(updatedState.items[0]).toMatchObject({
      qty: 4,
      name: 'Updated name',
      image: 'image.png',
      pricePaise: 4000,
      shopId: 's-2',
    });
  });

  it('updates quantity and removes the item when the qty becomes invalid', () => {
    let state = cartReducer(undefined, addItem(baseItem));

    const increased = cartReducer(state, updateQty({ productId: 'p-1', qty: 5.2 }));
    expect(selectCartItems(getState(increased))[0].qty).toBe(5);

    const removed = cartReducer(increased, updateQty({ productId: 'p-1', qty: 0 }));
    expect(removed.items).toHaveLength(0);
  });

  it('removes and clears items explicitly', () => {
    const stateWithItems = [
      addItem(baseItem),
      addItem({ ...baseItem, productId: 'p-2', shopId: 's-2' }),
    ].reduce(cartReducer, undefined as unknown as CartState);

    const afterRemoval = cartReducer(stateWithItems, removeItem('p-1'));
    expect(afterRemoval.items).toHaveLength(1);
    expect(afterRemoval.items[0].productId).toBe('p-2');

    const afterClear = cartReducer(afterRemoval, clearCart());
    expect(afterClear.items).toHaveLength(0);
  });

  it('clears a specific shop and keeps other items intact', () => {
    const stateWithItems = [
      addItem(baseItem),
      addItem({ ...baseItem, productId: 'p-2', shopId: 's-2' }),
    ].reduce(cartReducer, undefined as unknown as CartState);

    const cleared = cartReducer(stateWithItems, clearShop('s-1'));
    expect(cleared.items).toEqual([
      expect.objectContaining({ productId: 'p-2', shopId: 's-2' }),
    ]);
  });

  it('keeps selectors in sync with cart operations', () => {
    const actions = [
      addItem(baseItem),
      addItem({ ...baseItem, productId: 'p-2', shopId: 's-2', pricePaise: 1500, qty: 2 }),
      updateQty({ productId: 'p-1', qty: 4 }),
    ];

    const finalState = actions.reduce(
      (acc, action) => cartReducer(acc, action),
      undefined as unknown as CartState,
    );

    const root = getState(finalState);

    expect(selectItemCount(root)).toBe(6);
    expect(selectSubtotalPaise(root)).toBe(4 * 2500 + 2 * 1500);
    expect(selectByShop('s-1')(root)).toHaveLength(1);
    expect(selectByShop('s-2')(root)[0]).toMatchObject({
      productId: 'p-2',
      qty: 2,
    });
  });
});
