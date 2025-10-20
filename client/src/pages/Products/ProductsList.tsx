import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import SkeletonProductCard from '@/components/ui/Skeletons/SkeletonProductCard';
import EmptyState from '@/components/ui/EmptyState';
import ErrorCard from '@/components/ui/ErrorCard';
import { http } from '@/lib/http';
import { toErrorMessage, toItems } from '@/lib/response';
import { paths } from '@/routes/paths';
import fallbackImage from '@/assets/no-image.svg';
import { formatINR } from '@/utils/currency';
import { normalizeProduct } from '@/store/products';
import styles from './ProductsList.module.scss';
import cardStyles from './Products.module.scss';

import type { Product as ProductCardProduct } from '@/components/ui/ProductCard.tsx';

interface Product extends ProductCardProduct {
  category?: string;
  shop?: string | { _id?: string; id?: string; name?: string };
  shopId?: string;
  shopMeta?: {
    id?: string;
    name?: string;
    image?: string | null;
    location?: string | null;
  };
  updatedAt?: string;
  createdAt?: string;
}

type FiltersState = {
  search: string;
  shopId: string;
  category: string;
};

type RequestStatus = 'idle' | 'loading' | 'succeeded' | 'failed';

const defaultFilters: FiltersState = {
  search: '',
  shopId: '',
  category: '',
};

const sortOptions = [
  { value: 'newest', label: 'Newest' },
  { value: 'oldest', label: 'Oldest' },
  { value: 'priceDesc', label: 'Price: High to Low' },
  { value: 'priceAsc', label: 'Price: Low to High' },
  { value: 'discountDesc', label: 'Best Discount' },
];

const normalizeShopId = (product: Product): string => {
  if (product.shopMeta?.id) return product.shopMeta.id;
  if (product.shopId) return product.shopId;
  const rawShop = product.shop as any;
  if (typeof rawShop === 'string') return rawShop;
  if (rawShop?.id) return rawShop.id;
  if (rawShop?._id) return rawShop._id;
  return '';
};

const getShopName = (product: Product): string => {
  if (product.shopMeta?.name) return product.shopMeta.name;
  const rawShop = product.shop as any;
  if (rawShop?.name) return rawShop.name;
  if ((product as any).shopName) return String((product as any).shopName);
  return 'Unknown shop';
};

const getDiscount = (product: Product): number => {
  if (typeof product.discountPercent === 'number') return product.discountPercent;
  if (typeof product.mrpPaise === 'number' && product.mrpPaise > 0) {
    return Math.max(
      0,
      Math.round(
        ((Math.max(0, product.mrpPaise) - Math.max(0, product.pricePaise)) /
          Math.max(1, product.mrpPaise)) *
          100,
      ),
    );
  }
  return 0;
};

const getTimestamp = (product: Product): number => {
  const updated = product.updatedAt || (product as any).updatedAt;
  const created = product.createdAt || (product as any).createdAt;
  const source = updated || created;
  if (!source) return 0;
  const time = new Date(source).getTime();
  return Number.isFinite(time) ? time : 0;
};

const ProductsList = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState<RequestStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<Product[]>([]);
  const [filters, setFilters] = useState<FiltersState>(defaultFilters);
  const [appliedFilters, setAppliedFilters] = useState<FiltersState>(defaultFilters);
  const [sort, setSort] = useState<string>('newest');
  const [reloadKey, setReloadKey] = useState(0);

  const handleApply = useCallback(
    (event?: React.FormEvent<HTMLFormElement>) => {
      event?.preventDefault();
      const trimmedSearch = filters.search.trim();
      const nextFilters: FiltersState = {
        search: trimmedSearch,
        shopId: filters.shopId,
        category: filters.category,
      };
      const isSame =
        nextFilters.search === appliedFilters.search &&
        nextFilters.shopId === appliedFilters.shopId &&
        nextFilters.category === appliedFilters.category;
      setFilters(nextFilters);
      setAppliedFilters(nextFilters);
      if (isSame) {
        setReloadKey((key) => key + 1);
      }
    },
    [filters, appliedFilters]
  );

  const handleClear = useCallback(() => {
    setFilters(defaultFilters);
    setAppliedFilters(defaultFilters);
    setReloadKey((key) => key + 1);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    const load = async () => {
      setStatus('loading');
      setError(null);
      try {
        const response = await http.get('/products', {
          params: {
            query: appliedFilters.search || undefined,
            shopId: appliedFilters.shopId || undefined,
            category: appliedFilters.category || undefined,
          },
          signal: controller.signal,
        });
        if (!active) return;
        const rawItems = (toItems(response) ?? []) as any[];
        setItems(rawItems.map((item) => normalizeProduct(item) as Product));
        setStatus('succeeded');
      } catch (err: any) {
        if (!active) return;
        if (err?.code === 'ERR_CANCELED') return;
        setError(toErrorMessage(err));
        setStatus('failed');
      }
    };

    void load();

    return () => {
      active = false;
      controller.abort();
    };
  }, [appliedFilters.search, appliedFilters.shopId, appliedFilters.category, reloadKey]);

  const shopOptions = useMemo(() => {
    const map = new Map<string, string>();
    items.forEach((product) => {
      const id = normalizeShopId(product);
      if (!id) return;
      if (!map.has(id)) {
        map.set(id, getShopName(product));
      }
    });
    return Array.from(map.entries()).map(([value, label]) => ({ value, label }));
  }, [items]);

  const categoryOptions = useMemo(() => {
    const set = new Set<string>();
    items.forEach((product) => {
      const category = product.category || (product as any).category;
      if (typeof category === 'string' && category.trim()) {
        set.add(category.trim());
      }
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [items]);

  const visibleItems = useMemo(() => {
    const filtered = items.filter((product) => {
      const nameMatch = appliedFilters.search
        ? product.name.toLowerCase().includes(appliedFilters.search.toLowerCase())
        : true;
      const shopMatch = appliedFilters.shopId
        ? normalizeShopId(product) === appliedFilters.shopId
        : true;
      const categoryMatch = appliedFilters.category
        ? (product.category || '').toLowerCase() === appliedFilters.category.toLowerCase()
        : true;
      return nameMatch && shopMatch && categoryMatch;
    });

    const sorted = [...filtered];
    switch (sort) {
      case 'priceAsc':
        sorted.sort((a, b) => a.pricePaise - b.pricePaise);
        break;
      case 'priceDesc':
        sorted.sort((a, b) => b.pricePaise - a.pricePaise);
        break;
      case 'discountDesc':
        sorted.sort((a, b) => getDiscount(b) - getDiscount(a));
        break;
      case 'oldest':
        sorted.sort((a, b) => getTimestamp(a) - getTimestamp(b));
        break;
      case 'newest':
      default:
        sorted.sort((a, b) => getTimestamp(b) - getTimestamp(a));
        break;
    }
    return sorted;
  }, [
    items,
    appliedFilters.search,
    appliedFilters.shopId,
    appliedFilters.category,
    sort,
  ]);

  const isLoading = status === 'loading' && items.length === 0;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>All Products</h1>
        <p className={styles.subtitle}>
          Browse every product available across shops and refine the list with search and filters.
        </p>
      </header>

      <form className={styles.filters} onSubmit={handleApply}>
        <label className={styles.field}>
          <span>Search</span>
          <input
            type="search"
            name="search"
            value={filters.search}
            onChange={(event) =>
              setFilters((prev) => ({ ...prev, search: event.target.value }))
            }
            placeholder="Search by product name"
          />
        </label>
        <label className={styles.field}>
          <span>Shop</span>
          <select
            name="shopId"
            value={filters.shopId}
            onChange={(event) =>
              setFilters((prev) => ({ ...prev, shopId: event.target.value }))
            }
          >
            <option value="">All shops</option>
            {shopOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className={styles.field}>
          <span>Category</span>
          <select
            name="category"
            value={filters.category}
            onChange={(event) =>
              setFilters((prev) => ({ ...prev, category: event.target.value }))
            }
          >
            <option value="">All categories</option>
            {categoryOptions.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </label>
        <label className={`${styles.field} ${styles.sortField}`}>
          <span>Sort</span>
          <select value={sort} onChange={(event) => setSort(event.target.value)}>
            {sortOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <div className={styles.actions}>
          <button type="submit" className={styles.apply}>
            Apply filters
          </button>
          <button type="button" className={styles.clear} onClick={handleClear}>
            Clear filters
          </button>
        </div>
      </form>

      {status === 'failed' ? (
        <div className={styles.feedback}>
          <ErrorCard
            message={error || 'Failed to load products'}
            onRetry={() => setReloadKey((key) => key + 1)}
          />
        </div>
      ) : isLoading ? (
        <div className={cardStyles.grid}>
          {Array.from({ length: 8 }).map((_, index) => (
            <SkeletonProductCard key={index} />
          ))}
        </div>
      ) : visibleItems.length === 0 ? (
        <div className={styles.feedback}>
          <EmptyState
            title="No products found"
            message="Adjust your filters or refresh to explore products from every shop."
            ctaLabel="Refresh"
            onCtaClick={() => setReloadKey((key) => key + 1)}
          />
        </div>
      ) : (
        <div className={cardStyles.grid}>
          {visibleItems.map((product) => {
            const id = product._id || (product as any).id;
            const shopId = normalizeShopId(product);
            const primaryImage = Array.isArray(product.images)
              ? product.images.find((src) => typeof src === 'string' && src.trim())
              : product.image;
            const imageSrc = primaryImage || fallbackImage;
            const priceLabel = formatINR(product.pricePaise);
            const mrpValue = typeof product.mrpPaise === 'number' ? product.mrpPaise : undefined;
            const mrpLabel = typeof mrpValue === 'number' ? formatINR(mrpValue) : null;
            const discount = getDiscount(product);

            return (
              <button
                key={id ?? product.name}
                type="button"
                className={cardStyles.card}
                data-testid="product-card"
                onClick={() => {
                  if (id) {
                    navigate(paths.products.detail(String(id)));
                  }
                }}
              >
                <img
                  className={cardStyles.img}
                  src={imageSrc}
                  alt={product.name}
                  loading="lazy"
                  onError={(event) => {
                    event.currentTarget.src = fallbackImage;
                  }}
                />
                <h3 className={cardStyles.title}>{product.name}</h3>
                <div className={cardStyles.priceRow}>
                  <span>{priceLabel}</span>
                  {mrpLabel && mrpValue !== undefined && mrpValue > product.pricePaise && (
                    <span className={cardStyles.mrp}>{mrpLabel}</span>
                  )}
                  {discount > 0 && (
                    <span className={cardStyles.save}>Save {discount}%</span>
                  )}
                </div>
                <div className={cardStyles.meta}>
                  <span className={cardStyles.shop} title={getShopName(product)}>
                    {getShopName(product)}
                  </span>
                  {product.category ? (
                    <span className={cardStyles.category}>{product.category}</span>
                  ) : shopId ? (
                    <span className={cardStyles.category}>Shop #{shopId.slice(-4)}</span>
                  ) : null}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {status === 'loading' && items.length > 0 && (
        <div className={styles.loadingHint} role="status">
          Updating results…
        </div>
      )}
    </div>
  );
};

export default ProductsList;
