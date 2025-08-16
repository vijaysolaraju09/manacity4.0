import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../../api/client';
import { sampleSpecialProducts } from '../../data/sampleHomeData';
import Shimmer from '../../components/Shimmer';
import { FacetFilterBar, ProductCard } from '../../components/base';
import styles from './SpecialShop.module.scss';

interface Product {
  _id: string;
  name: string;
  description?: string;
  price: number;
  category?: string;
  image?: string;
  rating?: number;
  available?: boolean;
}

const SORT_OPTIONS = [
  { value: 'relevance', label: 'Relevance' },
  { value: 'priceAsc', label: 'Price: Low to High' },
  { value: 'priceDesc', label: 'Price: High to Low' },
];

const PAGE_SIZE = 6;

const SpecialShop = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState(searchParams.get('q') ?? '');
  const [category, setCategory] = useState(searchParams.get('category') ?? '');
  const [price, setPrice] = useState<number>(
    Number(searchParams.get('price')) || 1000,
  );
  const [rating, setRating] = useState<number>(
    Number(searchParams.get('rating')) || 0,
  );
  const [available, setAvailable] = useState(
    searchParams.get('available') === '1',
  );
  const [sort, setSort] = useState(
    searchParams.get('sort') || SORT_OPTIONS[0].value,
  );
  const [page, setPage] = useState<number>(
    Number(searchParams.get('page')) || 1,
  );

  const minPrice = 0;
  const maxPrice = 1000;

  useEffect(() => {
    const params: Record<string, string> = {};
    if (search) params.q = search;
    if (category) params.category = category;
    if (price !== maxPrice) params.price = String(price);
    if (rating) params.rating = String(rating);
    if (available) params.available = '1';
    if (sort !== SORT_OPTIONS[0].value) params.sort = sort;
    if (page > 1) params.page = String(page);
    setSearchParams(params);
  }, [search, category, price, rating, available, sort, page, setSearchParams]);

  useEffect(() => {
    setLoading(true);
    api
      .get('/special-shop', {
        params: { q: search, category, price, rating, available, sort, page },
      })
      .then((res) => {
        const data =
          Array.isArray(res.data) && res.data.length > 0
            ? res.data
            : (sampleSpecialProducts as unknown as Product[]);
        setProducts(data);
      })
      .catch(() =>
        setProducts(sampleSpecialProducts as unknown as Product[]),
      )
      .finally(() => setLoading(false));
  }, [search, category, price, rating, available, sort, page]);

  const categories = useMemo(
    () =>
      Array.from(
        new Set(
          products
            .map((p) => p.category)
            .filter((c): c is string => Boolean(c)),
        ),
      ),
    [products],
  );

  const filtered = products.filter((p) => {
    return (
      (!category || p.category === category) &&
      p.name.toLowerCase().includes(search.toLowerCase()) &&
      p.price <= price &&
      (rating === 0 || (p.rating ?? 0) >= rating) &&
      (!available || p.available)
    );
  });

  const sorted = [...filtered].sort((a, b) => {
    if (sort === 'priceAsc') return a.price - b.price;
    if (sort === 'priceDesc') return b.price - a.price;
    return 0;
  });

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const paginated = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const appliedFilters = [
    search && { label: `Search: ${search}`, onRemove: () => setSearch('') },
    category && { label: category, onRemove: () => setCategory('') },
    price !== maxPrice && {
      label: `≤₹${price}`,
      onRemove: () => setPrice(maxPrice),
    },
    rating > 0 && {
      label: `${rating}+★`,
      onRemove: () => setRating(0),
    },
    available && { label: 'In stock', onRemove: () => setAvailable(false) },
    sort !== SORT_OPTIONS[0].value && {
      label: SORT_OPTIONS.find((o) => o.value === sort)?.label || '',
      onRemove: () => setSort(SORT_OPTIONS[0].value),
    },
  ].filter(Boolean) as { label: string; onRemove: () => void }[];

  return (
    <div className={styles.shop}>
      <div className={styles.toolbar}>
        <input
          type="text"
          className="input"
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

      {appliedFilters.length > 0 && (
        <div className={styles.applied}>
          {appliedFilters.map((f) => (
            <button key={f.label} className="chip chip--selected" onClick={f.onRemove}>
              {f.label} ✕
            </button>
          ))}
        </div>
      )}

      <div className={styles.grid}>
        {loading
          ? Array.from({ length: PAGE_SIZE }).map((_, i) => (
              <div key={i} className={styles.card}>
                <Shimmer className="rounded" style={{ height: 140 }} />
                <Shimmer style={{ height: 16, marginTop: 8, width: '60%' }} />
              </div>
            ))
            : paginated.map((p) => (
                <ProductCard
                  key={p._id}
                  product={{
                    id: p._id,
                    title: p.name,
                    image: p.image ?? '',
                    price: p.price,
                  }}
                  ctaLabel="View"
                  onCtaClick={() => navigate(`/product/${p._id}`)}
                  onClick={() => navigate(`/product/${p._id}`)}
                />
              ))}
      </div>

      {!loading && totalPages > 1 && (
        <div className={styles.pagination}>
          <button
            type="button"
            className="btn btn-secondary"
            disabled={page === 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Previous
          </button>
          <span>
            Page {page} of {totalPages}
          </span>
          <button
            type="button"
            className="btn btn-secondary"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

export default SpecialShop;

