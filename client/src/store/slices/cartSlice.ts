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

const STORAGE_KEY = 'manacity_cart_items';

const sanitizeQty = (value: number): number => {
  if (!Number.isFinite(value)) return 1;
  const qty = Math.floor(value);
  return qty < 1 ? 1 : qty;
};

const normalizeVariantId = (variantId: string | null | undefined): string | undefined => {
  if (variantId === null || variantId === undefined) return undefined;
  const value = String(variantId).trim();
  return value.length > 0 ? value : undefined;
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
    variantId: normalizeVariantId(item.variantId),
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

        const rawVariant =
          typeof candidate.variantId === 'string' || typeof candidate.variantId === 'number'
            ? candidate.variantId
            : undefined;
        const variantId =
          rawVariant === undefined ? undefined : String(rawVariant);

        return sanitizeItem({
          productId,
          shopId,
          name: typeof candidate.name === 'string' ? candidate.name : 'Item',
          image: typeof candidate.image === 'string' ? candidate.image : undefined,
          pricePaise,
          qty,
          variantId,
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
  const snapshot = state.items.map((item) => ({ ...item }));
  persistCartItems(snapshot);
};

const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    addItem(state, action: PayloadAction<CartItem>) {
      const incoming = sanitizeItem(action.payload);
      const existing = state.items.find(
        (item) =>
          item.productId === incoming.productId &&
          item.shopId === incoming.shopId &&
          (item.variantId ?? '') === (incoming.variantId ?? ''),
      );

      if (existing) {
        existing.qty = sanitizeQty(existing.qty + incoming.qty);
        existing.name = incoming.name;
        existing.image = incoming.image;
        existing.pricePaise = incoming.pricePaise;
        existing.shopId = incoming.shopId;
        existing.variantId = incoming.variantId;
      } else {
        state.items.push(incoming);
      }

      touch(state);
    },
    updateItemQty(
      state,
      action: PayloadAction<{
        productId: string;
        shopId: string;
        qty: number;
        variantId?: string;
      }>,
    ) {
      const { productId, shopId, qty, variantId } = action.payload;
      const normalizedVariant = normalizeVariantId(variantId);
      const item = state.items.find(
        (entry) =>
          entry.productId === productId &&
          entry.shopId === shopId &&
          (entry.variantId ?? '') === (normalizedVariant ?? ''),
      );
      if (!item) return;

      const sanitizedQty = Math.floor(qty);
      if (!Number.isFinite(sanitizedQty) || sanitizedQty <= 0) {
        state.items = state.items.filter(
          (entry) =>
            !(
              entry.productId === productId &&
              entry.shopId === shopId &&
              (entry.variantId ?? '') === (normalizedVariant ?? '')
            ),
        );
      } else {
        item.qty = sanitizedQty;
      }

      touch(state);
    },
    removeItem(
      state,
      action: PayloadAction<{ productId: string; shopId: string; variantId?: string }>,
    ) {
      const { productId, shopId, variantId } = action.payload;
      const normalizedVariant = normalizeVariantId(variantId);
      state.items = state.items.filter(
        (item) =>
          !(
            item.productId === productId &&
            item.shopId === shopId &&
            (item.variantId ?? '') === (normalizedVariant ?? '')
          ),
      );
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
    hydrateCart(state, action: PayloadAction<CartItem[]>) {
      state.items = action.payload.map((item) => sanitizeItem(item));
      touch(state);
    },
  },
});

export const { addItem, updateItemQty, removeItem, clearCart, clearShop, hydrateCart } =
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
