import { createSelector, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from '..';

export type CartItem = {
  productId: string;
  shopId: string;
  name: string;
  image?: string;
  pricePaise: number;
  qty: number;
};

export type CartState = {
  items: CartItem[];
  currency: 'INR';
  lastUpdated: number;
};

const STORAGE_KEY = 'manacity_cart_items';

const sanitizeQty = (value: number): number => {
  if (!Number.isFinite(value)) return 1;
  const qty = Math.floor(value);
  return qty < 1 ? 1 : qty;
};

const sanitizeItem = (item: CartItem): CartItem => {
  return {
    productId: String(item.productId),
    shopId: String(item.shopId),
    name: item.name || 'Item',
    image: item.image || undefined,
    pricePaise: Number.isFinite(item.pricePaise)
      ? Math.max(0, Math.round(item.pricePaise))
      : 0,
    qty: sanitizeQty(item.qty),
  };
};

const loadCartItems = (): CartItem[] => {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item) => {
        if (!item || typeof item !== 'object') return undefined;
        const candidate = item as Partial<CartItem> & Record<string, unknown>;
        const productId = candidate.productId;
        const shopId = candidate.shopId;
        const pricePaise = candidate.pricePaise;
        const qty = candidate.qty;

        if (typeof productId !== 'string' || typeof shopId !== 'string') {
          return undefined;
        }
        if (typeof pricePaise !== 'number' || typeof qty !== 'number') {
          return undefined;
        }

        return sanitizeItem({
          productId,
          shopId,
          name: typeof candidate.name === 'string' ? candidate.name : 'Item',
          image: typeof candidate.image === 'string' ? candidate.image : undefined,
          pricePaise,
          qty,
        });
      })
      .filter((item): item is CartItem => Boolean(item));
  } catch (err) {
    console.error('Failed to load cart from storage', err);
    return [];
  }
};

const persistCartItems = (() => {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const delay = 150;
  return (items: CartItem[]) => {
    if (typeof localStorage === 'undefined') return;
    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
      } catch (err) {
        console.error('Failed to persist cart to storage', err);
      }
    }, delay);
  };
})();

const initialItems = loadCartItems();

const initialState: CartState = {
  items: initialItems,
  currency: 'INR',
  lastUpdated: initialItems.length > 0 ? Date.now() : 0,
};

const touch = (state: CartState) => {
  state.lastUpdated = Date.now();
  persistCartItems(state.items);
};

const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    addItem(state, action: PayloadAction<CartItem>) {
      const incoming = sanitizeItem(action.payload);
      const existing = state.items.find((item) => item.productId === incoming.productId);

      if (existing) {
        existing.qty = sanitizeQty(existing.qty + incoming.qty);
        existing.name = incoming.name;
        existing.image = incoming.image;
        existing.pricePaise = incoming.pricePaise;
        existing.shopId = incoming.shopId;
      } else {
        state.items.push(incoming);
      }

      touch(state);
    },
    updateQty(state, action: PayloadAction<{ productId: string; qty: number }>) {
      const { productId, qty } = action.payload;
      const item = state.items.find((entry) => entry.productId === productId);
      if (!item) return;

      const sanitizedQty = Math.floor(qty);
      if (!Number.isFinite(sanitizedQty) || sanitizedQty <= 0) {
        state.items = state.items.filter((entry) => entry.productId !== productId);
      } else {
        item.qty = sanitizedQty;
      }

      touch(state);
    },
    removeItem(state, action: PayloadAction<string>) {
      state.items = state.items.filter((item) => item.productId !== action.payload);
      touch(state);
    },
    clearCart(state) {
      state.items = [];
      touch(state);
    },
    clearShop(state, action: PayloadAction<string>) {
      const shopId = action.payload;
      state.items = state.items.filter((item) => item.shopId !== shopId);
      touch(state);
    },
  },
});

export const { addItem, updateQty, removeItem, clearCart, clearShop } =
  cartSlice.actions;

export const selectCartState = (state: RootState) => state.cart;
export const selectCartItems = (state: RootState) => state.cart.items;
export const selectItemCount = createSelector(selectCartItems, (items) =>
  items.reduce((total, item) => total + item.qty, 0),
);
export const selectSubtotalPaise = createSelector(selectCartItems, (items) =>
  items.reduce((total, item) => total + item.pricePaise * item.qty, 0),
);
export const selectByShop = (shopId: string) =>
  createSelector(selectCartItems, (items) =>
    items.filter((item) => item.shopId === shopId),
  );

export default cartSlice.reducer;
