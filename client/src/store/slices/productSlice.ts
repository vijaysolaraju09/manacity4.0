import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import { api } from '@/lib/http';

export interface Product {
  _id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  image?: string;
  images?: string[];
  mrp?: number;
  discount?: number;
  stock: number;
  shop: string;
}

interface ProductState {
  items: Product[];
  loading: boolean;
}

const initialState: ProductState = { items: [], loading: false };

export const fetchMyProducts = createAsyncThunk('products/fetchMy', async () => {
  const res = await api.get('/products/my');
  return res.data as Product[];
});

export const createProduct = createAsyncThunk('products/create', async (data: Partial<Product>) => {
  const res = await api.post('/products', data);
  return res.data as Product;
});

export const updateProduct = createAsyncThunk(
  'products/update',
  async ({ id, data }: { id: string; data: Partial<Product> }) => {
    const res = await api.put(`/products/${id}`, data);
    return res.data as Product;
  }
);

export const deleteProduct = createAsyncThunk('products/delete', async (id: string) => {
  await api.delete(`/products/${id}`);
  return id;
});

const productSlice = createSlice({
  name: 'products',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchMyProducts.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchMyProducts.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
      })
      .addCase(fetchMyProducts.rejected, (state) => {
        state.loading = false;
      })
      .addCase(createProduct.fulfilled, (state, action) => {
        state.items.push(action.payload);
      })
      .addCase(updateProduct.fulfilled, (state, action) => {
        const idx = state.items.findIndex((p) => p._id === action.payload._id);
        if (idx >= 0) state.items[idx] = action.payload;
      })
      .addCase(deleteProduct.fulfilled, (state, action: PayloadAction<string>) => {
        state.items = state.items.filter((p) => p._id !== action.payload);
      });
  },
});

export default productSlice.reducer;
