import { configureStore } from '@reduxjs/toolkit';
import userReducer from './slices/userSlice';
import cartReducer from './slices/cartSlice';
import productReducer from './slices/productSlice';
import themeReducer from './slices/themeSlice';

export const store = configureStore({
  reducer: {
    user: userReducer,
    cart: cartReducer,
    products: productReducer,
    theme: themeReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
