import type { CartItem } from '@/store/slices/cartSlice';

export type ProductInput = Record<PropertyKey, unknown> | null | undefined;

const toStringValue = (value: unknown): string => {
  if (value === null || value === undefined) return '';
  return String(value).trim();
};

const toPositiveInteger = (value: unknown, fallback = 1): number => {
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  const normalized = Math.floor(parsed);
  return normalized > 0 ? normalized : fallback;
};

const extractId = (product: Record<PropertyKey, unknown>): string => {
  const candidates: unknown[] = [
    product.productId,
    product._id,
    product.id,
    (product as { itemId?: unknown }).itemId,
    (product as { sku?: unknown }).sku,
  ];

  for (const candidate of candidates) {
    const normalized = toStringValue(candidate);
    if (normalized) {
      return normalized;
    }
  }

  throw new Error('Product is missing a valid identifier');
};

const extractShopId = (product: Record<PropertyKey, unknown>, productId: string): string => {
  const shopCandidates: unknown[] = [
    (product as { shopId?: unknown }).shopId,
    (product as { shop?: unknown }).shop,
    (product as { shop?: { _id?: unknown; id?: unknown } }).shop?._id,
    (product as { shop?: { _id?: unknown; id?: unknown } }).shop?.id,
    (product as { vendorId?: unknown }).vendorId,
  ];

  for (const candidate of shopCandidates) {
    const normalized = toStringValue(candidate);
    if (normalized) {
      return normalized;
    }
  }

  return productId;
};

const extractName = (product: Record<PropertyKey, unknown>): string => {
  const candidates: unknown[] = [
    (product as { name?: unknown }).name,
    (product as { title?: unknown }).title,
    (product as { displayName?: unknown }).displayName,
    (product as { label?: unknown }).label,
  ];

  for (const candidate of candidates) {
    const normalized = toStringValue(candidate);
    if (normalized) {
      return normalized;
    }
  }

  return 'Item';
};

const extractImage = (product: Record<PropertyKey, unknown>): string | undefined => {
  const direct = toStringValue((product as { image?: unknown }).image);
  if (direct) return direct;

  const thumbnail = toStringValue((product as { thumbnail?: unknown }).thumbnail);
  if (thumbnail) return thumbnail;

  const images = (product as { images?: unknown }).images;
  if (Array.isArray(images)) {
    for (const value of images) {
      const normalized = toStringValue(value);
      if (normalized) {
        return normalized;
      }
      if (value && typeof value === 'object') {
        const nested = toStringValue((value as { url?: unknown }).url ?? (value as { src?: unknown }).src);
        if (nested) {
          return nested;
        }
      }
    }
  }

  const media = (product as { media?: unknown }).media;
  if (Array.isArray(media)) {
    for (const entry of media) {
      if (!entry || typeof entry !== 'object') continue;
      const normalized = toStringValue((entry as { url?: unknown }).url ?? (entry as { src?: unknown }).src);
      if (normalized) {
        return normalized;
      }
    }
  }

  return undefined;
};

const toPaise = (value: unknown): number => {
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed)) return 0;
  const rounded = Math.round(parsed);
  return rounded >= 0 ? rounded : 0;
};

const extractPricePaise = (product: Record<PropertyKey, unknown>): number => {
  const candidatePaise: unknown[] = [
    (product as { pricePaise?: unknown }).pricePaise,
    (product as { unitPricePaise?: unknown }).unitPricePaise,
    (product as { sellingPricePaise?: unknown }).sellingPricePaise,
    (product as { mrpPaise?: unknown }).mrpPaise,
  ];

  for (const candidate of candidatePaise) {
    const normalized = toPaise(candidate);
    if (normalized > 0) {
      return normalized;
    }
  }

  const candidateRupees: unknown[] = [
    (product as { price?: unknown }).price,
    (product as { sellingPrice?: unknown }).sellingPrice,
    (product as { offerPrice?: unknown }).offerPrice,
  ];

  for (const candidate of candidateRupees) {
    const parsed = typeof candidate === 'number' ? candidate : Number(candidate);
    if (!Number.isFinite(parsed)) continue;
    const paise = Math.round(parsed * 100);
    if (paise > 0) {
      return paise;
    }
  }

  return 0;
};

const extractVariantId = (product: Record<PropertyKey, unknown>): string | undefined => {
  const candidates: unknown[] = [
    (product as { variantId?: unknown }).variantId,
    (product as { variant?: { _id?: unknown; id?: unknown } }).variant?._id,
    (product as { variant?: { _id?: unknown; id?: unknown } }).variant?.id,
    (product as { selectedVariant?: { _id?: unknown; id?: unknown } }).selectedVariant?._id,
    (product as { selectedVariant?: { _id?: unknown; id?: unknown } }).selectedVariant?.id,
  ];

  for (const candidate of candidates) {
    const normalized = toStringValue(candidate);
    if (normalized) {
      return normalized;
    }
  }

  return undefined;
};

export type BuildCartItemInput = {
  product: ProductInput;
  quantity?: number;
};

export const buildCartItem = ({ product, quantity = 1 }: BuildCartItemInput): CartItem => {
  if (!product || typeof product !== 'object') {
    throw new Error('Cannot add an unknown product to cart');
  }

  const record = product as Record<PropertyKey, unknown>;
  const productId = extractId(record);
  const shopId = extractShopId(record, productId);
  const name = extractName(record);
  const image = extractImage(record);
  const pricePaise = extractPricePaise(record);
  const variantId = extractVariantId(record);
  const qty = toPositiveInteger(quantity);

  return {
    productId,
    shopId,
    name,
    image,
    pricePaise,
    qty,
    variantId,
  };
};
