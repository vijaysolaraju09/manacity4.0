import { createSelector, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from '..';

export type CartItem = {
  productId: string;
  shopId: string;
  name: string;
  image?: string;
  pricePaise: number;
  qty: number;
  variantId?: string;
};

export type CartState = {
  items: CartItem[];
  currency: 'INR';
  lastUpdated: number;
};

const STORAGE_KEY = 'manacity:cart:v2';

const toPositiveInteger = (value: unknown, fallback = 1): number => {
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  const normalized = Math.floor(parsed);
  return normalized > 0 ? normalized : fallback;
};

const toPricePaise = (value: unknown): number => {
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed)) return 0;
  const normalized = Math.round(parsed);
  return normalized >= 0 ? normalized : 0;
};

const normalizeString = (value: unknown): string => {
  if (value === null || value === undefined) return '';
  return String(value).trim();
};

const normalizeVariant = (value: unknown): string | undefined => {
  const normalized = normalizeString(value);
  return normalized ? normalized : undefined;
};

const sanitizeItem = (input: CartItem): CartItem => {
  const productId = normalizeString(input.productId);
  const shopId = normalizeString(input.shopId || input.productId);
  if (!productId || !shopId) {
    throw new Error('Invalid cart item identifiers');
  }

  return {
    productId,
    shopId,
    name: normalizeString(input.name) || 'Item',
    image: normalizeString(input.image) || undefined,
    pricePaise: toPricePaise(input.pricePaise),
    qty: toPositiveInteger(input.qty),
    variantId: normalizeVariant(input.variantId),
  };
};

const loadItems = (): CartItem[] => {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    const items: CartItem[] = [];
    for (const value of parsed) {
      if (!value || typeof value !== 'object') continue;
      try {
        const sanitized = sanitizeItem(value as CartItem);
        items.push(sanitized);
      } catch {
        // Ignore invalid persisted entries.
      }
    }
    return items;
  } catch {
    return [];
  }
};

export const readPersistedCart = (): CartItem[] => loadItems();

let persistTimeout: ReturnType<typeof setTimeout> | undefined;
const persistItems = (items: CartItem[]) => {
  if (typeof localStorage === 'undefined') return;
  if (persistTimeout) {
    clearTimeout(persistTimeout);
  }
  persistTimeout = setTimeout(() => {
    try {
      const snapshot = items.map((item) => ({ ...item }));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
    } catch {
      // Ignore persistence failures.
    }
  }, 100);
};

const initialItems = loadItems();

const initialState: CartState = {
  items: initialItems,
  currency: 'INR',
  lastUpdated: initialItems.length > 0 ? Date.now() : 0,
};

const findMatchingIndex = (items: CartItem[], candidate: CartItem): number => {
  return items.findIndex(
    (item) =>
      item.productId === candidate.productId &&
      item.shopId === candidate.shopId &&
      (item.variantId ?? '') === (candidate.variantId ?? ''),
  );
};

const touch = (state: CartState) => {
  state.lastUpdated = Date.now();
  persistItems(state.items);
};

const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    hydrateCart(state, action: PayloadAction<CartItem[] | null | undefined>) {
      const incoming = Array.isArray(action.payload) ? action.payload : [];
      const sanitized: CartItem[] = [];
      incoming.forEach((item) => {
        try {
          sanitized.push(sanitizeItem(item));
        } catch {
          // Skip invalid entries.
        }
      });
      state.items = sanitized;
      touch(state);
    },
    addItem(state, action: PayloadAction<CartItem>) {
      const sanitized = sanitizeItem(action.payload);
      const index = findMatchingIndex(state.items, sanitized);
      if (index >= 0) {
        const existing = state.items[index];
        existing.qty = toPositiveInteger(existing.qty + sanitized.qty);
        existing.name = sanitized.name;
        existing.image = sanitized.image;
        existing.pricePaise = sanitized.pricePaise;
        existing.shopId = sanitized.shopId;
        existing.variantId = sanitized.variantId;
      } else {
        state.items.push(sanitized);
      }
      touch(state);
    },
    updateItemQty(
      state,
      action: PayloadAction<{ productId: string; shopId: string; qty: number; variantId?: string }>,
    ) {
      const { productId, shopId, qty, variantId } = action.payload;
      const probe: CartItem = {
        productId,
        shopId,
        name: 'Item',
        pricePaise: 0,
        qty: 1,
        variantId,
        image: undefined,
      };
      const index = findMatchingIndex(state.items, sanitizeItem(probe));
      if (index < 0) return;

      const nextQty = Math.floor(qty);
      if (!Number.isFinite(nextQty) || nextQty <= 0) {
        state.items.splice(index, 1);
      } else {
        state.items[index].qty = nextQty;
      }
      touch(state);
    },
    removeItem(
      state,
      action: PayloadAction<{ productId: string; shopId: string; variantId?: string }>,
    ) {
      const { productId, shopId, variantId } = action.payload;
      state.items = state.items.filter(
        (item) =>
          !(
            item.productId === normalizeString(productId) &&
            item.shopId === normalizeString(shopId) &&
            (item.variantId ?? '') === (normalizeVariant(variantId) ?? '')
          ),
      );
      touch(state);
    },
    clearCart(state) {
      state.items = [];
      touch(state);
    },
    clearShop(state, action: PayloadAction<{ shopId: string }>) {
      const shopId = normalizeString(action.payload.shopId);
      if (!shopId) return;
      state.items = state.items.filter((item) => item.shopId !== shopId);
      touch(state);
    },
  },
});

export const { addItem, updateItemQty, removeItem, clearCart, clearShop, hydrateCart } = cartSlice.actions;

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
    items.filter((item) => item.shopId === normalizeString(shopId)),
  );

export default cartSlice.reducer;
