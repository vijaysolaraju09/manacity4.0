import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { http } from "@/lib/http";
import { toItems, toItem, toErrorMessage } from "@/lib/response";
import { pickPaise, rupeesToPaise } from "@/utils/currency";

export interface Shop {
  id: string;
  _id: string;
  owner: string;
  name: string;
  category: string;
  location: string;
  address: string;
  image?: string | null;
  banner?: string | null;
  description?: string;
  status: "pending" | "approved" | "rejected";
  ratingAvg?: number;
  ratingCount?: number;
  createdAt?: string;
  contact?: string;
  isOpen?: boolean;
  distance?: number;
  products?: Product[];
}

interface Product {
  _id: string;
  id: string;
  name: string;
  pricePaise: number;
  image?: string;
  available?: boolean;
  shopId?: string;
}

type St<T> = {
  items: T[];
  item: T | null;
  status: "idle" | "loading" | "succeeded" | "failed";
  error: string | null;
  page?: number;
  hasMore?: boolean;
  products?: Product[];
  productsByShop: Record<string, Product[]>;
  currentProductsShopId: string | null;
};

const initial: St<Shop> = {
  items: [],
  item: null,
  status: "idle",
  error: null,
  page: 1,
  hasMore: true,
  products: [],
  productsByShop: {},
  currentProductsShopId: null,
};

const sanitizePaise = (value: unknown): number => {
  const raw = pickPaise(value);
  if (typeof raw === "number" && Number.isFinite(raw)) {
    return Math.max(0, Math.round(raw));
  }
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.round(parsed)) : 0;
};

const toIdString = (value: unknown): string | undefined => {
  if (value === null || value === undefined) return undefined;
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }
  if (typeof value === "number") {
    return Number.isFinite(value) ? String(value) : undefined;
  }
  if (typeof value === "object") {
    const source = value as Record<string, unknown>;
    return (
      toIdString(source._id) ||
      toIdString(source.id) ||
      toIdString(source.value) ||
      undefined
    );
  }
  return undefined;
};

export const normalizeShopProduct = (
  input: any,
  context?: { shopId?: string; shopName?: string },
): Product => {
  if (!input) {
    throw new Error("Invalid shop product");
  }

  const pricePaise = sanitizePaise(
    pickPaise(
      input.pricePaise,
      input.priceInPaise,
      input.price_in_paise,
      typeof input.price === "number" ? rupeesToPaise(input.price) : undefined,
    ) ?? rupeesToPaise(typeof input.price === "number" ? input.price : 0),
  );

  const rawShop = input.shop as unknown;
  const rawShopId =
    toIdString(input.shopId) ||
    toIdString((input as Record<string, unknown> | undefined)?.shop_id) ||
    (typeof rawShop === "string"
      ? rawShop
      : toIdString((rawShop as Record<string, unknown> | undefined)?._id) ||
        toIdString((rawShop as Record<string, unknown> | undefined)?.id));

  const resolvedShopId = rawShopId || context?.shopId;

  const candidateProductRef =
    (typeof input.product === "object" && input.product ? (input.product as Record<string, unknown>) : undefined) ||
    (typeof input.productSnapshot === "object" && input.productSnapshot
      ? (input.productSnapshot as Record<string, unknown>)
      : undefined);

  const resolvedProductId =
    toIdString(input._id) ||
    toIdString(input.id) ||
    toIdString(input.productId) ||
    toIdString((input as Record<string, unknown> | undefined)?.product_id) ||
    (candidateProductRef ? toIdString(candidateProductRef) : undefined) ||
    toIdString((input as Record<string, unknown> | undefined)?.slug) ||
    toIdString((input as Record<string, unknown> | undefined)?.sku) ||
    toIdString((input as Record<string, unknown> | undefined)?.uuid);

  const normalizedId = resolvedProductId ?? "";

  const normalized: Product & Record<string, unknown> = {
    ...input,
    _id: normalizedId,
    name: String(input.name ?? input.title ?? "Product"),
    pricePaise,
    image: typeof input.image === "string" ? input.image : undefined,
    available: typeof input.available === "boolean" ? input.available : undefined,
    shopId: resolvedShopId,
  };

  if (!normalized._id) {
    throw new Error("Product identifier is missing");
  }

  normalized.id = normalized._id;

  ["price", "pricePaise", "priceInPaise", "price_in_paise"].forEach((key) => {
    Reflect.deleteProperty(normalized, key);
  });

  normalized.pricePaise = pricePaise;

  if (!normalized.shop && resolvedShopId) {
    normalized.shop = {
      ...(typeof rawShop === "object" && rawShop ? (rawShop as Record<string, unknown>) : {}),
      id: resolvedShopId,
      _id: resolvedShopId,
      name:
        (typeof rawShop === "object" && rawShop && "name" in (rawShop as Record<string, unknown>)
          ? String((rawShop as { name?: unknown }).name ?? "")
          : undefined) ||
        context?.shopName ||
        undefined,
    };
  }

  if (!normalized.shopId && resolvedShopId) {
    normalized.shopId = resolvedShopId;
  }

  return normalized;
};

const normalizeShop = (input: any): Shop => {
  if (!input) {
    throw new Error("Invalid shop payload");
  }

  const normalizedId = String(input._id ?? input.id ?? "");
  const normalizedName = String(input.name ?? input.title ?? "Shop");

  const products = Array.isArray(input.products)
    ? (input.products
          .map((product: any) => {
            try {
              return normalizeShopProduct(product, {
                shopId: normalizedId || undefined,
                shopName: normalizedName,
              });
          } catch (err) {
            if (process.env.NODE_ENV !== "production") {
              // eslint-disable-next-line no-console
              console.warn("Skipping product without a valid identifier", err);
            }
            return null;
          }
          })
          .filter((item: Product | null): item is Product => Boolean(item)))
      : undefined;

  const normalized: Shop & Record<string, unknown> = {
    ...input,
    _id: normalizedId,
    id: String(input.id ?? input._id ?? ""),
    name: normalizedName,
    products,
  };

  return normalized;
};

export const fetchShops = createAsyncThunk(
  "shops/fetchAll",
  async (
    params: Record<string, any> | undefined,
    { rejectWithValue }: { rejectWithValue: (value: any) => any }
  ) => {
    try {
      const p = { ...(params || {}) };
      if (p.status) {
        const map: Record<string, string> = { active: "approved", suspended: "rejected" };
        p.status = map[p.status] || p.status;
      }
      const res = await http.get("/shops", { params: p });
      const items = toItems(res) as any[];
      return items.map(normalizeShop);
    } catch (err) {
      return rejectWithValue(toErrorMessage(err));
    }
  }
);

export const fetchShopById = createAsyncThunk(
  "shops/fetchById",
  async (id: string, { rejectWithValue }) => {
    try {
      const res = await http.get(`/shops/${id}`);
      return normalizeShop(toItem(res));
    } catch (err) {
      return rejectWithValue(toErrorMessage(err));
    }
  }
);

export const fetchProductsByShop = createAsyncThunk(
  "shops/fetchProducts",
  async (id: string, { rejectWithValue }) => {
    try {
      const res = await http.get(`/shops/${id}/products`);
      const items = toItems(res) as any[];
      const normalizedItems = items
        .map((product) => {
          try {
            return normalizeShopProduct(product, { shopId: id });
          } catch (err) {
            if (process.env.NODE_ENV !== "production") {
              // eslint-disable-next-line no-console
              console.warn("Skipping product without a valid identifier", err);
            }
            return null;
          }
        })
        .filter((item): item is Product => Boolean(item));
      return {
        id,
        items: normalizedItems,
      };
    } catch (err) {
      return rejectWithValue(toErrorMessage(err));
    }
  }
);

const shopsSlice = createSlice({
  name: "shops",
  initialState: initial,
  reducers: {},
  extraReducers: (b) => {
    b.addCase(fetchShops.pending, (s) => {
      s.status = "loading";
      s.error = null;
    });
    b.addCase(fetchShops.fulfilled, (s, a) => {
      s.status = "succeeded";
      s.items = a.payload as Shop[];
    });
    b.addCase(fetchShops.rejected, (s, a) => {
      s.status = "failed";
      s.error = (a.payload as string) || (a.error as any)?.message || "Failed to load";
    });
    b.addCase(fetchShopById.pending, (s, a) => {
      s.status = "loading";
      s.error = null;
      s.item = null;
      const requestedId = typeof a.meta.arg === "string" ? a.meta.arg : null;
      s.currentProductsShopId = requestedId;
      if (requestedId && s.productsByShop[requestedId]) {
        s.products = s.productsByShop[requestedId];
      } else {
        s.products = [];
      }
    });
    b.addCase(fetchShopById.fulfilled, (s, a) => {
      s.status = "succeeded";
      s.item = a.payload as Shop;
      const shopId = s.item?._id || s.item?.id || null;
      s.currentProductsShopId = shopId ?? null;
      if (shopId && s.productsByShop[shopId]) {
        s.products = s.productsByShop[shopId];
      }
    });
    b.addCase(fetchShopById.rejected, (s, a) => {
      s.status = "failed";
      s.error = (a.payload as string) || (a.error as any)?.message || "Failed to load";
    });
    b.addCase(fetchProductsByShop.pending, (s, a) => {
      const id = typeof a.meta.arg === "string" ? a.meta.arg : null;
      if (!id) return;
      s.currentProductsShopId = id;
      if (s.productsByShop[id]) {
        s.products = s.productsByShop[id];
      } else {
        s.products = [];
      }
    });
    b.addCase(fetchProductsByShop.fulfilled, (s, a) => {
      const { id, items } = a.payload as { id: string; items: Product[] };
      s.productsByShop[id] = items;

      if (s.currentProductsShopId === id) {
        s.products = items;
      }
    });
    b.addCase(fetchProductsByShop.rejected, (s, a) => {
      s.error = (a.payload as string) || (a.error as any)?.message || "Failed to load";
    });
  },
});

export default shopsSlice.reducer;
