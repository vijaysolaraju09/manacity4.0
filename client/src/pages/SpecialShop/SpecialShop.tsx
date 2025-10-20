import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { FacetFilterBar } from '../../components/base';
import ProductCard from '../../components/ui/ProductCard.tsx';
import SkeletonProductCard from '../../components/ui/Skeletons/SkeletonProductCard';
import EmptyState from '../../components/ui/EmptyState';
import styles from './SpecialShop.module.scss';
import { fetchSpecialProducts } from '@/store/products';
import type { RootState } from '@/store';
import ErrorCard from '@/components/common/ErrorCard';

const SORT_OPTIONS = [
  { value: 'relevance', label: 'Relevance' },
  { value: 'priceAsc', label: 'Price: Low to High' },
  { value: 'priceDesc', label: 'Price: High to Low' },
];

const SpecialShop = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const d = useDispatch<any>();
  const { items: products, status, error } = useSelector((s: RootState) => s.catalog);

  const [search, setSearch] = useState(searchParams.get('q') ?? '');
  const [category, setCategory] = useState(searchParams.get('category') ?? '');
  const [price, setPrice] = useState<number>(Number(searchParams.get('price')) || 1000);
  const [rating, setRating] = useState<number>(Number(searchParams.get('rating')) || 0);
  const [available, setAvailable] = useState(searchParams.get('available') === '1');
  const [sort, setSort] = useState(searchParams.get('sort') || SORT_OPTIONS[0].value);
  const [page, setPage] = useState<number>(Number(searchParams.get('page')) || 1);

  useEffect(() => {
    const params: Record<string, string> = {};
    if (search) params.q = search;
    if (category) params.category = category;
    if (price && price !== 1000) params.price = String(price);
    if (rating) params.rating = String(rating);
    if (available) params.available = '1';
    if (sort !== SORT_OPTIONS[0].value) params.sort = sort;
    if (page > 1) params.page = String(page);
    setSearchParams(params);
    d(fetchSpecialProducts(params));
  }, [search, category, price, rating, available, sort, page, setSearchParams, d]);

  const categories = useMemo(
    () =>
      Array.from(
        new Set(products.map((p) => p.category).filter((c): c is string => Boolean(c))),
      ),
    [products],
  );

  const minPrice = 0;
  const maxPrice = 1000;

  if (status === 'loading')
    return (
      <div className={styles.grid}>
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonProductCard key={i} />
        ))}
      </div>
    );
  if (status === 'failed')
    return (
      <ErrorCard
        msg={error || 'Failed to load products'}
        onRetry={() => d(fetchSpecialProducts(Object.fromEntries(searchParams)))}
      />
    );
  if (status === 'succeeded' && products.length === 0)
    return <EmptyState message="No products found" />;

  return (
    <div className={styles.shop}>
      <div className={styles.header}>
        <div className={styles.toolbar}>
          <input
            type="text"
            className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-700 shadow-sm"
            placeholder="Search products"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
          <FacetFilterBar
            categories={categories}
            activeCategory={category}
            onCategoryChange={(c) => {
              setCategory(c);
              setPage(1);
            }}
            price={price}
            minPrice={minPrice}
            maxPrice={maxPrice}
            onPriceChange={(p) => {
              setPrice(p);
              setPage(1);
            }}
            rating={rating}
            onRatingChange={(r) => {
              setRating(r);
              setPage(1);
            }}
            available={available}
            onAvailabilityChange={(v) => {
              setAvailable(v);
              setPage(1);
            }}
            sort={sort}
            sortOptions={SORT_OPTIONS}
            onSortChange={(v) => {
              setSort(v);
              setPage(1);
            }}
          />
        </div>
      </div>

      <div className={styles.grid}>
        {products.map((p) => (
          <ProductCard
            key={p._id}
            product={p}
            onClick={() => navigate(`/product/${p._id}`)}
          />
        ))}
      </div>
    </div>
  );
};

export default SpecialShop;
