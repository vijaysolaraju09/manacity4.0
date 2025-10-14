import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export interface CartItem {
  productId: string;
  name: string;
  pricePaise: number;
  qty: number;
  image?: string;
  shopId: string;
  shopName?: string;
}

interface CartState {
  items: CartItem[];
}

const STORAGE_KEY = 'manacity_cart_items';

const loadCartItems = (): CartItem[] => {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item) => {
        const candidate = item as Partial<CartItem>;
        if (!candidate?.productId || !candidate?.shopId) return undefined;
        if (typeof candidate.pricePaise !== 'number' || typeof candidate.qty !== 'number') {
          return undefined;
        }
        return {
          productId: String(candidate.productId),
          shopId: String(candidate.shopId),
          name: String(candidate.name ?? ''),
          pricePaise: candidate.pricePaise,
          qty: candidate.qty,
          image: candidate.image,
          shopName: candidate.shopName,
        } satisfies CartItem;
      })
      .filter((item): item is CartItem => Boolean(item));
  } catch (err) {
    console.error('Failed to load cart from storage', err);
    return [];
  }
};

const persistCartItems = (items: CartItem[]) => {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch (err) {
    console.error('Failed to persist cart to storage', err);
  }
};

const initialState: CartState = {
  items: loadCartItems(),
};

const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    addToCart(state, action: PayloadAction<CartItem>) {
      const existing = state.items.find((i) => i.productId === action.payload.productId);
      if (existing) {
        existing.qty += action.payload.qty;
      } else {
        state.items.push(action.payload);
      }
      persistCartItems(state.items);
    },
    removeFromCart(state, action: PayloadAction<string>) {
      state.items = state.items.filter((i) => i.productId !== action.payload);
      persistCartItems(state.items);
    },
    updateQuantity(state, action: PayloadAction<{ productId: string; qty: number }>) {
      const item = state.items.find((i) => i.productId === action.payload.productId);
      if (item) item.qty = action.payload.qty;
      persistCartItems(state.items);
    },
    clearCart(state) {
      state.items = [];
      persistCartItems(state.items);
    },
  },
});

export const { addToCart, removeFromCart, clearCart, updateQuantity } = cartSlice.actions;
export default cartSlice.reducer;
