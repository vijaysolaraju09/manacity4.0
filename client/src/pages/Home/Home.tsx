import './Home.scss';
import { motion } from 'framer-motion';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import ProductCard from '../../components/ui/ProductCard.tsx';
import SectionHeader from '../../components/ui/SectionHeader';
import HorizontalCarousel from '../../components/ui/HorizontalCarousel';
import EmptyState from '../../components/ui/EmptyState';
import { fetchShops } from '@/store/shops';
import { fetchVerified } from '@/store/verified';
import { fetchEvents } from '@/store/events';
import { fetchSpecialProducts } from '@/store/products';
import { http } from '@/lib/http';
import type { RootState } from '@/store';
import EventsSkeleton from '@/components/common/EventsSkeleton';
import ShopsSkeleton from '@/components/common/ShopsSkeleton';
import ProductsSkeleton from '@/components/common/ProductsSkeleton';
import ErrorCard from '@/components/ui/ErrorCard';
import SkeletonList from '@/components/ui/SkeletonList';
import fallbackImage from '../../assets/no-image.svg';
import { formatDateTime } from '@/utils/date';
import VerifiedCard from '@/components/ui/VerifiedCard/VerifiedCard';

const Home = () => {
  const navigate = useNavigate();
  const d = useDispatch<any>();

  const [banners, setBanners] = useState<any[]>([]);
  const [bannerStatus, setBannerStatus] = useState<'loading' | 'succeeded' | 'failed'>('loading');
  const [bannerError, setBannerError] = useState<string | null>(null);

  const shops = useSelector((s: RootState) => s.shops);
  const verified = useSelector((s: RootState) => s.verified);
  const events = useSelector((s: RootState) => s.events.list);
  const products = useSelector((s: RootState) => s.catalog);

  const loadBanners = useCallback(async () => {
    setBannerStatus('loading');
    setBannerError(null);
    try {
      const res = await http.get('/admin/messages');
      const items = Array.isArray(res.data) ? res.data : [];
      const filtered = items.filter((m: any) => m.type === 'banner');
      setBanners(filtered);
      setBannerStatus('succeeded');
    } catch {
      setBanners([]);
      setBannerStatus('failed');
      setBannerError('Failed to load banners');
    }
  }, []);

  useEffect(() => {
    void loadBanners();
  }, [loadBanners]);

  useEffect(() => {
    if (shops.status === 'idle') d(fetchShops({ sort: '-createdAt', pageSize: 10 }));
    if (verified.status === 'idle') d(fetchVerified({ pageSize: 10 }));
    if (events.status === 'idle') d(fetchEvents({ status: 'upcoming', pageSize: 6 }));
    if (products.status === 'idle') d(fetchSpecialProducts({ pageSize: 10 }));
  }, [shops.status, verified.status, events.status, products.status, d]);

  return (
    <div className="home">
      <div className="section">
        <SectionHeader title="Admin Banners" />
        {bannerStatus === 'loading' ? (
          <SkeletonList count={1} lines={1} />
        ) : bannerStatus === 'failed' ? (
          <ErrorCard
            message={bannerError || 'Failed to load banners'}
            onRetry={() => {
              void loadBanners();
            }}
          />
        ) : (banners ?? []).length === 0 ? (
          <EmptyState
            title="No banners configured"
            message="Add a banner to highlight announcements, offers, or important updates for your community."
            ctaLabel="Refresh"
            onCtaClick={() => {
              void loadBanners();
            }}
          />
        ) : (
          <HorizontalCarousel>
            {(banners ?? []).map((b) => (
              <motion.img
                key={b._id}
                src={b.image || fallbackImage}
                alt={b.message || 'banner'}
                loading="lazy"
                style={{ width: '100%', aspectRatio: '16/9', objectFit: 'cover' }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              />
            ))}
          </HorizontalCarousel>
        )}
      </div>

      <Section
        title="Shop Offers"
        path="/shops"
        data={shops.items}
        status={shops.status}
        error={shops.error}
        type="product"
        onRetry={() => d(fetchShops({ sort: '-createdAt', pageSize: 10 }))}
        navigate={navigate}
      />
      <Section
        title="Verified Users"
        path="/verified-users"
        data={verified.items}
        status={verified.status}
        error={verified.error}
        type="user"
        onRetry={() => d(fetchVerified({ pageSize: 10 }))}
        navigate={navigate}
      />
      <Section
        title="Events"
        path="/events"
        data={events.items}
        status={events.status}
        error={events.error}
        type="event"
        onRetry={() => d(fetchEvents({ status: 'upcoming', pageSize: 6 }))}
        navigate={navigate}
      />
      <Section
        title="Special Shop Products"
        path="/special-shop"
        data={products.items}
        status={products.status}
        error={products.error}
        type="product"
        onRetry={() => d(fetchSpecialProducts({ pageSize: 10 }))}
        navigate={navigate}
      />
    </div>
  );
};

interface SectionProps {
  title: string;
  path: string;
  data: any[];
  status: string;
  error: string | null;
  type: 'product' | 'user' | 'event';
  onRetry: () => void;
  navigate: ReturnType<typeof useNavigate>;
}

const Section = ({ title, path, data, status, error, type, onRetry, navigate }: SectionProps) => {
  const loading = status === 'loading';
  if (loading)
    return (
      <div className="section">
        <SectionHeader title={title} onClick={() => navigate(path)} />
        {type === 'product' ? <ProductsSkeleton /> : type === 'event' ? <EventsSkeleton /> : <ShopsSkeleton />}
      </div>
    );
  if (status === 'failed')
    return (
      <div className="section">
        <SectionHeader title={title} onClick={() => navigate(path)} />
        <ErrorCard message={error || `Failed to load ${title}`} onRetry={onRetry} />
      </div>
    );
  if (status === 'succeeded' && data.length === 0)
    return (
      <div className="section">
        <SectionHeader title={title} onClick={() => navigate(path)} />
        <EmptyState message={`No ${title.toLowerCase()}`} />
      </div>
    );
  return (
    <div className="section">
      <SectionHeader title={title} onClick={() => navigate(path)} />
      <HorizontalCarousel>
        {data.map((item: any) =>
          type === 'product' ? (
            <ProductCard
              key={item._id}
              product={item}
              onClick={() => navigate(`/product/${item._id}`)}
            />
          ) : type === 'user' ? (
            <VerifiedCard
              key={item._id}
              card={item}
              onClick={() => navigate(`/verified-users/${item._id}`)}
            />
          ) : (
            <motion.div
              key={item._id}
              className="card"
              whileHover={{ scale: 1.03 }}
              onClick={() => navigate(`/events/${item._id}`)}
            >
              <img
                src={item.bannerUrl || item.coverUrl || fallbackImage}
                alt={item.title || item.name}
                loading="lazy"
                width={150}
                height={150}
                style={{ objectFit: 'cover', aspectRatio: '1 / 1' }}
                onError={(e) => (e.currentTarget.src = fallbackImage)}
              />
              <div className="card-info">
                <h4>{item.title || item.name}</h4>
                {type === 'event' && (
                  <p>{formatDateTime(item.startAt)}</p>
                )}
              </div>
            </motion.div>
          )
        )}
      </HorizontalCarousel>
    </div>
  );
};

export default Home;
