import type { Product } from '@/store/products';
import { paths } from '@/routes/paths';
import { DEFAULT_SPECIAL_PRODUCT_IMAGE } from '@/constants/specials';

const sanitizeString = (value: unknown): string => {
  if (typeof value !== 'string') return '';
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : '';
};

const getRawLabel = (product: Product): string => {
  const candidates: unknown[] = [product.ctaLabel, product.actionLabel];
  for (const candidate of candidates) {
    const value = sanitizeString(candidate);
    if (value) return value;
  }
  return '';
};

export const ensureSpecialProductImage = (product: Product): string => {
  const image = sanitizeString(product.image);
  return image || DEFAULT_SPECIAL_PRODUCT_IMAGE;
};

export const getSpecialProductDiscount = (product: Product): number | undefined => {
  const price = typeof product.pricePaise === 'number' ? product.pricePaise : 0;
  const mrp = typeof product.mrpPaise === 'number' ? product.mrpPaise : undefined;
  if (!mrp || mrp <= 0 || !Number.isFinite(price) || price <= 0 || price >= mrp) {
    return undefined;
  }
  return Math.max(0, Math.round(((mrp - price) / mrp) * 100));
};

export const getSpecialProductCallPhone = (product: Product): string | undefined => {
  const candidates: unknown[] = [product.ctaPhone, product.phone, product.contactNumber];
  for (const candidate of candidates) {
    const value = sanitizeString(candidate);
    if (value) return value;
  }
  return undefined;
};

export const isSpecialProductCallToOrder = (product: Product): boolean => {
  const phone = getSpecialProductCallPhone(product);
  if (!phone) return false;
  const type = sanitizeString(product.ctaType).toLowerCase();
  if (type === 'call' || type === 'phone') {
    return true;
  }
  const label = getRawLabel(product).toLowerCase();
  return label.includes('call');
};

export const getSpecialProductCtaLabel = (product: Product): string => {
  const raw = getRawLabel(product);
  if (raw) return raw;
  return isSpecialProductCallToOrder(product) ? 'Call to Order' : 'View details';
};

export const getSpecialProductDetailsTarget = (product: Product): string | null => {
  const url = sanitizeString(product.ctaUrl);
  if (url) return url;
  const productId = sanitizeString(product.productId ?? product._id);
  if (productId) return paths.products.detail(productId);
  return null;
};
