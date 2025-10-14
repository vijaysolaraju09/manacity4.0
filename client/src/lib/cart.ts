import type { CartItem } from '@/store/slices/cartSlice';

type MaybeString = string | number | undefined | null;

interface ProductLike {
  _id?: MaybeString;
  id?: MaybeString;
  name?: string;
  title?: string;
  price?: number;
  pricePaise?: number;
  priceInPaise?: number;
  unitPrice?: number;
  image?: string | null;
  images?: string[];
  productId?: MaybeString;
  shop?: unknown;
  shopId?: MaybeString;
  shopMeta?: { id?: MaybeString; name?: string; image?: string | null };
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
  title?: string;
  price?: number;
  pricePaise?: number;
  priceInPaise?: number;
  unitPrice?: number;
  image?: string;
  product?: ProductLike;
}

const toIdString = (value: MaybeString): string | undefined => {
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  return undefined;
};

const sanitizeQuantity = (value: number): number => {
  if (!Number.isFinite(value)) return 1;
  const quantity = Math.floor(value);
  return quantity > 0 ? quantity : 1;
};

const extractShopId = (
  product: ProductLike,
  responseItem?: CartResponseLike,
): string | undefined => {
  const rawShop = product.shop as ShopLike | string | undefined;
  const rawShopMeta = product.shopMeta as { id?: MaybeString } | undefined;

  return (
    toIdString(product.shopId) ||
    toIdString(rawShopMeta?.id) ||
    (typeof rawShop === 'string' ? rawShop : toIdString(rawShop?._id) ?? toIdString(rawShop?.id)) ||
    toIdString(responseItem?.shopId) ||
    (typeof responseItem?.shop === 'string'
      ? responseItem?.shop
      : toIdString(responseItem?.shop?._id) ?? toIdString(responseItem?.shop?.id))
  );
};

const extractProductId = (
  product: ProductLike,
  responseItem?: CartResponseLike,
): string | undefined => {
  return (
    toIdString(product.productId) ||
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
    responseItem?.priceInPaise,
    typeof responseItem?.price === 'number' ? Math.round(responseItem.price * 100) : undefined,
    typeof responseItem?.unitPrice === 'number'
      ? Math.round(responseItem.unitPrice * 100)
      : undefined,
    product.pricePaise,
    product.priceInPaise,
    typeof product.price === 'number' ? Math.round(product.price * 100) : undefined,
    typeof product.unitPrice === 'number' ? Math.round(product.unitPrice * 100) : undefined,
  ];

  for (const value of candidates) {
    if (typeof value === 'number' && Number.isFinite(value)) return Math.round(value);
  }

  return undefined;
};

const extractName = (
  product: ProductLike,
  responseItem?: CartResponseLike,
): string => {
  return (
    product.name ||
    product.title ||
    responseItem?.name ||
    responseItem?.title ||
    responseItem?.productName ||
    responseItem?.product?.name ||
    responseItem?.product?.title ||
    'Item'
  );
};

const extractImage = (
  product: ProductLike,
  responseItem?: CartResponseLike,
): string | undefined => {
  if (product.image) return product.image || undefined;
  if (Array.isArray(product.images) && product.images.length > 0) return product.images[0];
  const responseProduct = responseItem?.product;
  if (responseProduct?.image) return responseProduct.image || undefined;
  if (Array.isArray(responseProduct?.images) && responseProduct.images.length > 0)
    return responseProduct.images[0];
  return responseItem?.image || undefined;
};

const mergeProductShape = (
  product: ProductLike,
  responseItem?: CartResponseLike,
): ProductLike => {
  if (!responseItem?.product) return product;
  if (typeof responseItem.product !== 'object') return product;
  return {
    ...(responseItem.product as ProductLike),
    ...product,
  };
};

export const toCartItem = (
  product: ProductLike,
  qty = 1,
  responseItem?: CartResponseLike,
): CartItem => {
  if (!product) {
    throw new Error('Invalid product');
  }

  const mergedProduct = mergeProductShape(product, responseItem);
  const productId = extractProductId(mergedProduct, responseItem);
  const shopId = extractShopId(mergedProduct, responseItem);
  const pricePaise = extractPricePaise(mergedProduct, responseItem);

  if (!productId) {
    throw new Error('Missing product id');
  }

  if (!shopId) {
    throw new Error('Missing shop id');
  }

  if (typeof pricePaise !== 'number') {
    throw new Error('Missing product price');
  }

  return {
    productId,
    shopId,
    name: extractName(mergedProduct, responseItem),
    pricePaise: Math.max(0, Math.round(pricePaise)),
    qty: sanitizeQuantity(qty),
    image: extractImage(mergedProduct, responseItem),
  };
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
  try {
    return toCartItem(product, quantity, responseItem);
  } catch (err) {
    console.error('Failed to normalize cart item', err);
    return null;
  }
};

