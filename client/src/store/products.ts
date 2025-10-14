import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { http } from "@/lib/http";
import { toItems, toItem, toErrorMessage } from "@/lib/response";
import { pickPaise, rupeesToPaise } from "@/utils/currency";

export interface Product {
  _id: string;
  name: string;
  description?: string;
  pricePaise: number;
  category?: string;
  image?: string;
  images?: string[];
  mrpPaise?: number;
  discountPercent?: number;
  ratingAvg?: number;
  available?: boolean;
  isSpecial?: boolean;
  shop?: string;
}

type St<T> = {
  items: T[];
  item: T | null;
  status: "idle" | "loading" | "succeeded" | "failed";
  error: string | null;
  page?: number;
  hasMore?: boolean;
};

const initial: St<Product> = {
  items: [],
  item: null,
  status: "idle",
  error: null,
  page: 1,
  hasMore: true,
};

const sanitizePaise = (value: number | undefined): number | undefined => {
  if (typeof value !== "number") return undefined;
  if (!Number.isFinite(value)) return undefined;
  return Math.max(0, Math.round(value));
};

export const normalizeProduct = (input: any): Product => {
  if (!input) {
    throw new Error("Invalid product payload");
  }

  const pricePaise =
    sanitizePaise(
      pickPaise(
        input.pricePaise,
        input.priceInPaise,
        input.price_in_paise,
        typeof input.price === "number" ? rupeesToPaise(input.price) : undefined,
        typeof input.unitPrice === "number" ? rupeesToPaise(input.unitPrice) : undefined,
      ),
    ) ?? 0;

  const mrpPaise = sanitizePaise(
    pickPaise(
      input.mrpPaise,
      input.mrpInPaise,
      input.mrp_in_paise,
      typeof input.mrp === "number" ? rupeesToPaise(input.mrp) : undefined,
    ),
  );

  let discountPercent: number | undefined;
  const discountCandidates = [input.discountPercent, input.discount];
  for (const candidate of discountCandidates) {
    if (typeof candidate === "number" && Number.isFinite(candidate)) {
      discountPercent = Math.max(0, Math.round(candidate));
      break;
    }
  }

  if (discountPercent === undefined && mrpPaise && mrpPaise > 0) {
    discountPercent = Math.max(
      0,
      Math.round(((mrpPaise - pricePaise) / mrpPaise) * 100),
    );
  }

  const images = Array.isArray(input.images)
    ? (input.images.filter((value: unknown): value is string => typeof value === "string") as string[])
    : undefined;

  const normalized: Product & Record<string, unknown> = {
    ...input,
    _id: String(input._id ?? input.id ?? ""),
    name: String(input.name ?? input.title ?? "Product"),
    description: typeof input.description === "string" ? input.description : undefined,
    pricePaise,
    category: typeof input.category === "string" ? input.category : undefined,
    image: typeof input.image === "string" ? input.image : undefined,
    images,
    mrpPaise: mrpPaise ?? undefined,
    discountPercent,
    ratingAvg:
      typeof input.ratingAvg === "number"
        ? input.ratingAvg
        : typeof input.rating === "number"
        ? input.rating
        : undefined,
    available: typeof input.available === "boolean" ? input.available : undefined,
    isSpecial: typeof input.isSpecial === "boolean" ? input.isSpecial : undefined,
  };

  delete normalized.price;
  delete normalized.pricePaise;
  delete normalized.priceInPaise;
  delete normalized.price_in_paise;
  delete normalized.mrp;
  delete normalized.mrpPaise;
  delete normalized.mrpInPaise;
  delete normalized.mrp_in_paise;
  delete normalized.discount;
  delete normalized.discountPercent;

  normalized.pricePaise = pricePaise;
  normalized.mrpPaise = mrpPaise ?? undefined;
  normalized.discountPercent = discountPercent;

  return normalized;
};

export const fetchSpecialProducts = createAsyncThunk(
  "products/fetchSpecial",
  async (params: any | undefined, { rejectWithValue }) => {
    try {
      const res = await http.get("/special", { params });
      const items = toItems(res) as any[];
      return items.map(normalizeProduct);
    } catch (err) {
      return rejectWithValue(toErrorMessage(err));
    }
  }
);

export const fetchProductById = createAsyncThunk(
  "products/fetchById",
  async (id: string, { rejectWithValue }) => {
    try {
      const res = await http.get(`/products/${id}`);
      return normalizeProduct(toItem(res));
    } catch (err) {
      return rejectWithValue(toErrorMessage(err));
    }
  }
);

const productsSlice = createSlice({
  name: "products",
  initialState: initial,
  reducers: {
    clearItem(s) {
      s.item = null;
    },
  },
  extraReducers: (b) => {
    b.addCase(fetchSpecialProducts.pending, (s) => {
      s.status = "loading";
      s.error = null;
    });
    b.addCase(fetchSpecialProducts.fulfilled, (s, a) => {
      s.status = "succeeded";
      s.items = a.payload as Product[];
    });
    b.addCase(fetchSpecialProducts.rejected, (s, a) => {
      s.status = "failed";
      s.error = (a.payload as string) || (a.error as any)?.message || "Failed to load";
    });
    b.addCase(fetchProductById.pending, (s) => {
      s.status = "loading";
      s.error = null;
      s.item = null;
    });
    b.addCase(fetchProductById.fulfilled, (s, a) => {
      s.status = "succeeded";
      s.item = a.payload as Product;
    });
    b.addCase(fetchProductById.rejected, (s, a) => {
      s.status = "failed";
      s.error = (a.payload as string) || (a.error as any)?.message || "Failed to load";
    });
  },
});

export const { clearItem } = productsSlice.actions;
export default productsSlice.reducer;
