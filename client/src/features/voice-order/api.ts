import { http } from '@/lib/http';
import { toItems } from '@/lib/response';
import { normalizeProduct } from '@/store/products';
import type { ParsedItem, VoiceProductHit } from './types';

const resolveShopInfo = (input: any): { shopId: string; shopName: string } => {
  const fallbackName = typeof input?.shopName === 'string' ? input.shopName : 'Shop';
  const shopCandidate = input?.shop || input?.shopDetails || input?.store || null;

  if (shopCandidate && typeof shopCandidate === 'object') {
    const shopIdRaw = shopCandidate._id ?? shopCandidate.id ?? input?.shopId;
    const shopId = shopIdRaw ? String(shopIdRaw) : '';
    const shopName =
      typeof shopCandidate.name === 'string' && shopCandidate.name.trim()
        ? shopCandidate.name.trim()
        : fallbackName;
    return { shopId, shopName };
  }

  const shopIdRaw = input?.shopId ?? input?.storeId ?? input?.vendorId;
  const shopId = shopIdRaw ? String(shopIdRaw) : '';
  const shopName =
    typeof input?.shopName === 'string' && input.shopName.trim()
      ? input.shopName.trim()
      : shopId
      ? `Shop ${shopId}`
      : fallbackName;

  return { shopId, shopName };
};

export const adaptProduct = (input: any): VoiceProductHit | null => {
  try {
    const product = normalizeProduct(input);
    const { shopId, shopName } = resolveShopInfo(input);
    const imageCandidate = product.image || (Array.isArray(product.images) ? product.images[0] : undefined);

    if (!product._id || !shopId) {
      return null;
    }

    return {
      id: product._id,
      name: product.name,
      image: imageCandidate || undefined,
      pricePaise: product.pricePaise,
      shopId,
      shopName,
      available: product.available ?? true,
      raw: { ...input },
    } satisfies VoiceProductHit;
  } catch (error) {
    console.error('Failed to adapt product', error, input);
    return null;
  }
};

export const searchProducts = async (
  query: string,
  options?: { signal?: AbortSignal; limit?: number },
): Promise<VoiceProductHit[]> => {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const response = await http.get('/products', {
    params: { q: trimmed, limit: options?.limit ?? 20 },
    signal: options?.signal,
  });

  const items = toItems(response);
  if (!Array.isArray(items)) return [];

  return items
    .map((item) => adaptProduct(item))
    .filter((item): item is VoiceProductHit => Boolean(item));
};

export const searchForParsedItems = async (
  parsed: ParsedItem[],
  options?: { signal?: AbortSignal },
): Promise<Record<string, VoiceProductHit[]>> => {
  const results: Record<string, VoiceProductHit[]> = {};

  await Promise.all(
    parsed.map(async (item) => {
      try {
        const hits = await searchProducts(item.name, { signal: options?.signal });
        results[item.name] = hits;
      } catch (error) {
        if ((error as any)?.name === 'CanceledError' || (error as any)?.name === 'AbortError') {
          return;
        }
        console.error('Voice search failed', error);
        results[item.name] = [];
      }
    }),
  );

  return results;
};
