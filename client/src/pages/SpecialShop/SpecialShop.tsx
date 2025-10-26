import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import SpecialProductCard from '@/components/specials/SpecialProductCard';
import SkeletonProductCard from '@/components/ui/Skeletons/SkeletonProductCard';
import EmptyState from '@/components/ui/EmptyState';
import ErrorCard from '@/components/common/ErrorCard';
import { fetchSpecialProducts, type Product } from '@/store/products';
import type { AppDispatch, RootState } from '@/store';
import {
  getSpecialProductDetailsTarget,
  isSpecialProductCallToOrder,
} from '@/utils/specialProducts';
import styles from './SpecialShop.module.scss';

const SpecialShop = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { items: products, status, error } = useSelector((state: RootState) => state.catalog);

  useEffect(() => {
    if (status === 'idle') {
      dispatch(fetchSpecialProducts(undefined));
    }
  }, [status, dispatch]);

  const handleRetry = () => {
    dispatch(fetchSpecialProducts(undefined));
  };

  const handleDetails = (product: Product) => {
    const target = getSpecialProductDetailsTarget(product);
    if (!target) return;

    if (/^https?:/i.test(target)) {
      window.open(target, '_blank', 'noopener');
      return;
    }

    navigate(target);
  };

  if (status === 'loading' || status === 'idle') {
    return (
      <div className={styles.shop}>
        <div className={styles.header}>
          <h1>Special Shop</h1>
          <p>Curated, limited-availability offers from our verified partners.</p>
        </div>
        <div className={styles.grid}>
          {Array.from({ length: 6 }).map((_, index) => (
            <SkeletonProductCard key={index} />
          ))}
        </div>
      </div>
    );
  }

  if (status === 'failed') {
    return <ErrorCard msg={error || 'Failed to load products'} onRetry={handleRetry} />;
  }

  if (products.length === 0) {
    return (
      <div className={styles.shop}>
        <div className={styles.header}>
          <h1>Special Shop</h1>
          <p>Curated, limited-availability offers from our verified partners.</p>
        </div>
        <EmptyState message="No special products are available right now." />
      </div>
    );
  }

  return (
    <div className={styles.shop}>
      <div className={styles.header}>
        <h1>Special Shop</h1>
        <p>Discover curated offers and seasonal bundles from verified providers.</p>
      </div>
      <div className={styles.grid}>
        {products.map((product) => (
          <SpecialProductCard
            key={product._id}
            product={product}
            onDetails={isSpecialProductCallToOrder(product) ? undefined : handleDetails}
          />
        ))}
      </div>
    </div>
  );
};

export default SpecialShop;
