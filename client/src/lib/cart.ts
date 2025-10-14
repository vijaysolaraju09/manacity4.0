import type { CartItem } from '@/store/slices/cartSlice';

type MaybeString = string | number | undefined | null;

interface ProductLike {
  _id?: MaybeString;
  id?: MaybeString;
  name?: string;
  price?: number;
  pricePaise?: number;
  image?: string;
  images?: string[];
  shop?: unknown;
  shopId?: MaybeString;
  shopName?: string;
}

interface ShopLike {
  _id?: MaybeString;
  id?: MaybeString;
  name?: string;
}

interface CartResponseLike {
  productId?: MaybeString;
  shopId?: MaybeString;
  shop?: ShopLike | string | null;
  shopName?: string;
  name?: string;
  productName?: string;
  price?: number;
  pricePaise?: number;
  image?: string;
  product?: ProductLike;
}

const toIdString = (value: MaybeString): string | undefined => {
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  return undefined;
};

const extractShopId = (
  product: ProductLike,
  responseItem?: CartResponseLike,
): string | undefined => {
  const rawShop = product.shop as ShopLike | string | undefined;

  return (
    toIdString(product.shopId) ||
    (typeof rawShop === 'string' ? rawShop : toIdString(rawShop?._id) ?? toIdString(rawShop?.id)) ||
    toIdString(responseItem?.shopId) ||
    (typeof responseItem?.shop === 'string'
      ? responseItem?.shop
      : toIdString(responseItem?.shop?._id) ?? toIdString(responseItem?.shop?.id))
  );
};

const extractShopName = (
  product: ProductLike,
  responseItem?: CartResponseLike,
): string | undefined => {
  const rawShop = product.shop as ShopLike | undefined;
  return (
    product.shopName ||
    rawShop?.name ||
    (typeof responseItem?.shop === 'object' ? responseItem?.shop?.name : undefined) ||
    responseItem?.shopName
  );
};

const extractProductId = (
  product: ProductLike,
  responseItem?: CartResponseLike,
): string | undefined => {
  return (
    toIdString(product._id) ||
    toIdString(product.id) ||
    toIdString(responseItem?.productId) ||
    toIdString(responseItem?.product?._id) ||
    toIdString(responseItem?.product?.id)
  );
};

const extractPricePaise = (
  product: ProductLike,
  responseItem?: CartResponseLike,
): number | undefined => {
  const candidates = [
    responseItem?.pricePaise,
    typeof responseItem?.price === 'number' ? Math.round(responseItem.price * 100) : undefined,
    product.pricePaise,
    typeof product.price === 'number' ? Math.round(product.price * 100) : undefined,
  ];

  for (const value of candidates) {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
  }

  return undefined;
};

const extractName = (
  product: ProductLike,
  responseItem?: CartResponseLike,
): string => {
  return (
    product.name ||
    responseItem?.name ||
    responseItem?.productName ||
    responseItem?.product?.name ||
    'Item'
  );
};

const extractImage = (
  product: ProductLike,
  responseItem?: CartResponseLike,
): string | undefined => {
  if (product.image) return product.image;
  if (Array.isArray(product.images) && product.images.length > 0) return product.images[0];
  return responseItem?.image || responseItem?.product?.image;
};

export interface BuildCartItemOptions {
  product: ProductLike;
  quantity: number;
  responseItem?: CartResponseLike;
}

export const buildCartItemPayload = ({
  product,
  quantity,
  responseItem,
}: BuildCartItemOptions): CartItem | null => {
  const productId = extractProductId(product, responseItem);
  const shopId = extractShopId(product, responseItem);
  const pricePaise = extractPricePaise(product, responseItem);

  if (!productId || !shopId || typeof pricePaise !== 'number') {
    return null;
  }

  return {
    productId,
    shopId,
    name: extractName(product, responseItem),
    pricePaise,
    qty: quantity,
    image: extractImage(product, responseItem),
    shopName: extractShopName(product, responseItem),
  };
};

