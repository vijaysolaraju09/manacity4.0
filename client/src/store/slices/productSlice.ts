import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import { http } from '@/lib/http';
import { toItems, toItem, toErrorMessage } from '@/lib/response';

export interface Product {
  _id: string;
  id?: string;
  shopId: string;
  name: string;
  description: string;
  price: number;
  pricePaise?: number;
  category: string;
  image?: string;
  images?: string[];
  mrp?: number;
  mrpPaise?: number;
  discount?: number;
  stock: number;
  shop: string;
  available?: boolean;
}

export interface CreateProductPayload {
  shopId: string;
  name: string;
  description?: string;
  pricePaise: number;
  mrpPaise: number;
  category: string;
  imageUrl?: string;
  stock: number;
}

export type UpdateProductPayload = Partial<CreateProductPayload> & {
  name?: string;
  pricePaise?: number;
  mrpPaise?: number;
};

interface ProductState {
  items: Product[];
  loading: boolean;
}

const initialState: ProductState = { items: [], loading: false };

export const fetchMyProducts = createAsyncThunk(
  'products/fetchMy',
  async (_: void, { rejectWithValue }) => {
    try {
      const res = await http.get('/products/my');
      return toItems(res) as Product[];
    } catch (err) {
      return rejectWithValue(toErrorMessage(err));
    }
  }
);

export const createProduct = createAsyncThunk(
  'products/create',
  async (data: CreateProductPayload, { rejectWithValue }) => {
    try {
      const res = await http.post('/products', data);
      return toItem(res) as Product;
    } catch (err) {
      return rejectWithValue(toErrorMessage(err));
    }
  }
);

export const updateProduct = createAsyncThunk(
  'products/update',
  async (
    { id, data }: { id: string; data: UpdateProductPayload },
    { rejectWithValue }
  ) => {
    try {
      const { shopId, ...payload } = data;
      if (!shopId) {
        const res = await http.patch(`/products/${id}`, data);
        return toItem(res) as Product;
      }
      const sanitizedPayload = Object.fromEntries(
        Object.entries(payload).filter(([, value]) => value !== undefined)
      ) as Partial<UpdateProductPayload>;
      const res = await http.patch(`/shops/${shopId}/products/${id}`, sanitizedPayload);
      return toItem(res) as Product;
    } catch (err) {
      return rejectWithValue(toErrorMessage(err));
    }
  }
);

export const deleteProduct = createAsyncThunk('products/delete', async (id: string) => {
  await http.delete(`/products/${id}`);
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
