import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { AiFillStar } from 'react-icons/ai';
import { FiPhone, FiArrowLeft, FiShare2 } from 'react-icons/fi';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from '@/store';
import { fetchShopById, fetchProductsByShop, type Shop } from '@/store/shops';
import Shimmer from '../../components/Shimmer';
import ProductCard, { type Product } from '../../components/ui/ProductCard.tsx';
import SkeletonProductCard from '../../components/ui/Skeletons/SkeletonProductCard';
import EmptyState from '../../components/ui/EmptyState';
import OrderModal from '../../components/ui/OrderModal/OrderModal';
import showToast from '../../components/ui/Toast';
import './ShopDetails.scss';
import fallbackImage from '../../assets/no-image.svg';

const ShopDetails = () => {
  const { id } = useParams();
  const dispatch = useDispatch<AppDispatch>();
  const { item: shop, products, status, error } = useSelector(
    (s: RootState) => s.shops
  );
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('relevance');
  const [selected, setSelected] = useState<Product | null>(null);
  const [orderOpen, setOrderOpen] = useState(false);
  const [tab, setTab] = useState<'all' | 'available'>('all');

  useEffect(() => {
    if (id) {
      dispatch(fetchShopById(id));
      dispatch(fetchProductsByShop(id));
    }
  }, [id, dispatch]);

  const filtered = useMemo(() => {
    const bySearch = products.filter((p) =>
      p.name.toLowerCase().includes(search.toLowerCase()),
    );
    const byTab = tab === 'available' ? bySearch.filter((p) => p.available) : bySearch;
    const sorted = [...byTab];
    if (sort === 'priceAsc') sorted.sort((a, b) => a.price - b.price);
    if (sort === 'priceDesc') sorted.sort((a, b) => b.price - a.price);
    return sorted;
  }, [products, search, sort, tab]);

  if (status === 'loading' || !shop)
    return (
      <div className="shop-details">
        <div className="hero">
          <Shimmer style={{ width: '100%', height: 200 }} className="rounded" />
        </div>
        <div className="filters">
          <Shimmer style={{ height: 36, width: '100%' }} />
        </div>
        <div className="product-grid">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonProductCard key={i} />
          ))}
        </div>
      </div>
    );

  if (status === 'failed' || !shop)
    return (
      <div className="shop-details">
        <EmptyState message={error || 'Failed to load shop'} />
      </div>
    );

  return (
    <div className="shop-details">
      <div className="mini-toolbar">
        <button onClick={() => window.history.back()} aria-label="Back">
          <FiArrowLeft />
        </button>
        {shop.contact && (
          <a href={`tel:${shop.contact}`} aria-label="Call">
            <FiPhone />
          </a>
        )}
        <button
          onClick={() => {
            if (navigator.share) {
              navigator.share({ title: shop.name, url: window.location.href });
            } else {
              navigator.clipboard.writeText(window.location.href);
              showToast('Link copied');
            }
          }}
          aria-label="Share"
        >
          <FiShare2 />
        </button>
      </div>

      <div className="hero">
        <img
          className="cover"
          src={shop.banner || shop.image || fallbackImage}
          alt={shop.name}
          onError={(e) => (e.currentTarget.src = fallbackImage)}
        />
        <div className="overlay">
          <h2>{shop.name}</h2>
          {shop.ratingAvg !== undefined && (
            <div className="rating">
              <AiFillStar color="var(--color-warning)" />
              <span>{shop.ratingAvg.toFixed(1)}</span>
            </div>
          )}
          <p className="address">{shop.address || shop.location}</p>
          {shop.isOpen !== undefined && (
            <span className={`status ${shop.isOpen ? 'open' : 'closed'}`}>
              {shop.isOpen ? 'Open' : 'Closed'}
            </span>
          )}
        </div>
      </div>

      <div className="tabs">
        <button
          className={tab === 'all' ? 'active' : ''}
          onClick={() => setTab('all')}
        >
          All Products
        </button>
        <button
          className={tab === 'available' ? 'active' : ''}
          onClick={() => setTab('available')}
        >
          Available
        </button>
      </div>

      <div className="filters">
        <input
          type="text"
          placeholder="Search products"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select value={sort} onChange={(e) => setSort(e.target.value)}>
          <option value="relevance">Sort: Relevance</option>
          <option value="priceAsc">Price: Low to High</option>
          <option value="priceDesc">Price: High to Low</option>
        </select>
      </div>

      <div className="product-grid">
        {filtered.length === 0 ? (
          <EmptyState message="No products found" />
        ) : (
          filtered.map((product) => (
            <ProductCard
              key={product._id}
              product={product}
              onClick={() => {
                setSelected(product);
                setOrderOpen(true);
              }}
            />
          ))
        )}
      </div>
      <OrderModal
        open={orderOpen}
        onClose={() => setOrderOpen(false)}
        product={selected}
        shopId={shop._id}
      />
    </div>
  );
};

export default ShopDetails;
