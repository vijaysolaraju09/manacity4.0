import { rupeesToPaise } from '@/utils/currency';
import { addItem } from '../slices/cartSlice';

type AddToCartPayload = {
  productId: string;
  shopId?: string;
  qty: number;
  name?: string;
  image?: string;
  price?: number;
  pricePaise?: number;
  variantId?: string;
};

const normalizeQty = (qty: number): number => {
  const parsed = Number.isFinite(qty) ? Math.floor(qty) : 0;
  return parsed > 0 ? parsed : 1;
};

const normalizePricePaise = (payload: AddToCartPayload): number => {
  if (typeof payload.pricePaise === 'number' && Number.isFinite(payload.pricePaise)) {
    return Math.max(0, Math.round(payload.pricePaise));
  }
  if (typeof payload.price === 'number' && Number.isFinite(payload.price)) {
    return Math.max(0, rupeesToPaise(payload.price));
  }
  return 0;
};

export const addToCart = (payload: AddToCartPayload) => {
  const productId = String(payload.productId ?? '').trim();
  if (!productId) {
    throw new Error('productId is required');
  }
  const shopId = String(payload.shopId ?? productId).trim() || productId;
  const qty = normalizeQty(payload.qty);
  const pricePaise = normalizePricePaise(payload);
  const name = payload.name?.toString().trim() || 'Item';
  const image = payload.image?.toString().trim() || undefined;
  const variantId = payload.variantId?.toString().trim() || undefined;

  return addItem({
    productId,
    shopId,
    qty,
    pricePaise,
    name,
    image,
    variantId,
  });
};
