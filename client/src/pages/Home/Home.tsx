import styles from './Home.module.scss';
import { motion } from 'framer-motion';
import { Mic } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import ProductCard from '../../components/ui/ProductCard.tsx';
import SectionHeader from '../../components/ui/SectionHeader';
import EmptyState from '../../components/ui/EmptyState';
import { fetchShops } from '@/store/shops';
import { fetchVerified } from '@/store/verified';
import { createEventsQueryKey, fetchEvents } from '@/store/events';
import { fetchSpecialProducts } from '@/store/products';
import { http } from '@/lib/http';
import { toItems, toErrorMessage } from '@/lib/response';
import type { RootState } from '@/store';
import EventsSkeleton from '@/components/common/EventsSkeleton';
import ShopsSkeleton from '@/components/common/ShopsSkeleton';
import ProductsSkeleton from '@/components/common/ProductsSkeleton';
import ErrorCard from '@/components/ui/ErrorCard';
import SkeletonList from '@/components/ui/SkeletonList';
import fallbackImage from '../../assets/no-image.svg';
import { formatDateTime } from '@/utils/date';
import VerifiedCard from '@/components/ui/VerifiedCard/VerifiedCard';
import { paths } from '@/routes/paths';
import ShopCard from '@/components/ui/ShopCard/ShopCard';
import Button from '@/components/ui/button';

const Home = () => {
  const navigate = useNavigate();
  const d = useDispatch<any>();

  const [banners, setBanners] = useState<any[]>([]);
  const [bannerStatus, setBannerStatus] = useState<'idle' | 'loading' | 'succeeded' | 'failed'>('idle');
  const [bannerError, setBannerError] = useState<string | null>(null);

  const shops = useSelector((s: RootState) => s.shops);
  const verified = useSelector((s: RootState) => s.verified);
  const events = useSelector((s: RootState) => s.events.list);
  const products = useSelector((s: RootState) => s.catalog);

  const featuredEventsParams = useMemo(
    () => ({ limit: 4 }),
    [],
  );
  const featuredEventsKey = useMemo(
    () => createEventsQueryKey(featuredEventsParams),
    [featuredEventsParams],
  );

  const loadBanners = useCallback(async () => {
    setBannerStatus('loading');
    setBannerError(null);
    try {
      const res = await http.get('/admin/messages');
      const items = toItems(res);
      const filtered = items.filter((m: any) => m.type === 'banner');
      setBanners(filtered);
      setBannerStatus('succeeded');
    } catch (err) {
      setBanners([]);
      setBannerStatus('failed');
      setBannerError(toErrorMessage(err));
    }
  }, []);

  useEffect(() => {
    if (bannerStatus === 'idle') {
      void loadBanners();
    }
  }, [bannerStatus, loadBanners]);

  useEffect(() => {
    if (shops.status === 'idle') d(fetchShops({ sort: '-createdAt', pageSize: 10 }));
    if (verified.status === 'idle') d(fetchVerified({ pageSize: 10 }));
    if (products.status === 'idle') d(fetchSpecialProducts({ pageSize: 10 }));
  }, [shops.status, verified.status, products.status, d]);

  useEffect(() => {
    if (events.status === 'loading') return;

    if (events.status === 'idle' || events.lastQueryKey !== featuredEventsKey) {
      const promise = d(fetchEvents(featuredEventsParams));
      return () => {
        promise.abort?.();
      };
    }
    return undefined;
  }, [d, events.status, events.lastQueryKey, featuredEventsKey, featuredEventsParams]);

  return (
    <div className="space-y-12">
      <section className={`${styles.hero}`}>
        <div className="px-4 md:px-6 lg:px-8 space-y-8">
          <div className={styles.section}>
            <SectionHeader title="Admin Banners" className={styles.sectionHeader} />
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
              <div className={styles.grid}>
                {(banners ?? []).map((b) => (
                  <motion.div
                    key={b._id}
                    className={`${styles.card} overflow-hidden`}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <img
                      src={b.image || fallbackImage}
                      alt={b.message || 'banner'}
                      loading="lazy"
                      className="h-44 w-full object-cover"
                      onError={(e) => (e.currentTarget.src = fallbackImage)}
                    />
                    {b.message && (
                      <div className="px-4 py-3">
                        <p className="text-sm text-gray-600">{b.message}</p>
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          <motion.div
            className={`${styles.card} overflow-hidden px-4 py-6 md:px-6 lg:px-8`}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex flex-col gap-3">
                <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-600">
                  <Mic className="h-4 w-4" aria-hidden="true" /> Voice Order
                </span>
                <h2 className="text-2xl font-semibold text-gray-900">Speak groceries into your cart</h2>
                <p className="max-w-2xl text-sm text-gray-600">
                  Talk to Manacity in Telugu, Hindi or English. We instantly parse your request, surface matching products across neighbourhood shops and let you checkout from one place.
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <Button className="gap-2" size="lg" onClick={() => navigate(paths.voiceOrder())}>
                  <Mic className="h-4 w-4" aria-hidden="true" /> Try Voice Order
                </Button>
                <Button
                  variant="secondary"
                  className="gap-2"
                  onClick={() => navigate(paths.voiceOrder())}
                >
                  Learn more
                </Button>
              </div>
            </div>
            <ul className="mt-6 flex flex-wrap gap-3 text-xs text-gray-600">
              <li className="rounded-full border border-gray-200 bg-gray-100 px-3 py-1">“oka kilo tomatolu”</li>
              <li className="rounded-full border border-gray-200 bg-gray-100 px-3 py-1">“2 kg bendakayalu”</li>
              <li className="rounded-full border border-gray-200 bg-gray-100 px-3 py-1">“tomato one kilo”</li>
            </ul>
          </motion.div>
        </div>
      </section>

      <Section
        title="Featured Shops"
        path={paths.shops()}
        data={shops.items}
        status={shops.status}
        error={shops.error}
        type="shop"
        onRetry={() => d(fetchShops({ sort: '-createdAt', pageSize: 10 }))}
        navigate={navigate}
        linkLabel="See all shops"
      />
      <Section
        title="Verified Users"
        path={paths.verifiedUsers.list()}
        data={verified.items}
        status={verified.status}
        error={verified.error}
        type="user"
        onRetry={() => d(fetchVerified({ pageSize: 10 }))}
        navigate={navigate}
      />
      <Section
        title="Events"
        path={paths.events.list()}
        data={events.items}
        status={events.status}
        error={events.error}
        type="event"
        onRetry={() => d(fetchEvents(featuredEventsParams))}
        navigate={navigate}
        linkLabel="See all events"
      />
      <Section
        title="Special Shop Products"
        path={paths.specialShop()}
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
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
  type: 'product' | 'user' | 'event' | 'shop';
  onRetry: () => void;
  navigate: ReturnType<typeof useNavigate>;
  linkLabel?: string;
}

const Section = ({
  title,
  path,
  data,
  status,
  error,
  type,
  onRetry,
  navigate,
  linkLabel,
}: SectionProps) => {
  const loading = status === 'loading' || status === 'idle';
  const items = Array.isArray(data) ? data : [];
  if (loading)
    return (
      <section className={`${styles.section} px-4 md:px-6 lg:px-8`}>
        <SectionHeader
          title={title}
          onClick={() => navigate(path)}
          linkLabel={linkLabel}
          className={styles.sectionHeader}
        />
        {type === 'product' ? (
          <ProductsSkeleton />
        ) : type === 'event' ? (
          <EventsSkeleton />
        ) : (
          <ShopsSkeleton />
        )}
      </section>
    );
  if (status === 'failed')
    return (
      <section className={`${styles.section} px-4 md:px-6 lg:px-8`}>
        <SectionHeader
          title={title}
          onClick={() => navigate(path)}
          linkLabel={linkLabel}
          className={styles.sectionHeader}
        />
        <ErrorCard message={error || `Failed to load ${title}`} onRetry={onRetry} />
      </section>
    );
  if (status === 'succeeded' && items.length === 0)
    return (
      <section className={`${styles.section} px-4 md:px-6 lg:px-8`}>
        <SectionHeader
          title={title}
          onClick={() => navigate(path)}
          linkLabel={linkLabel}
          className={styles.sectionHeader}
        />
        <EmptyState message={`No ${title.toLowerCase()}`} />
      </section>
    );
  return (
    <section className={`${styles.section} px-4 md:px-6 lg:px-8`}>
      <SectionHeader
        title={title}
        onClick={() => navigate(path)}
        linkLabel={linkLabel}
        className={styles.sectionHeader}
      />
      <div className={styles.grid}>
        {items.map((item: any) => {
          if (type === 'product') {
            return (
              <ProductCard
                key={item._id}
                product={item}
                onClick={() => navigate(paths.products.detail(item._id))}
              />
            );
          }

          if (type === 'user') {
            return (
              <VerifiedCard
                key={item._id}
                card={item}
                onClick={() => navigate(paths.verifiedUsers.detail(item._id))}
              />
            );
          }

          if (type === 'shop') {
            const shopId = item._id ?? item.id;
            return (
              <ShopCard
                key={shopId}
                shop={{
                  _id: shopId,
                  name: item.name,
                  category: item.category ?? 'Shop',
                  location: item.location ?? item.address,
                  image: item.image,
                  logo: item.logo,
                  banner: item.banner,
                  rating: item.ratingAvg ?? item.rating,
                  distance: item.distance,
                  isOpen: item.isOpen,
                }}
                onClick={() => navigate(paths.shop(shopId))}
              />
            );
          }

          const eventId = item._id;
          return (
            <motion.div
              key={eventId}
              className={`${styles.card} overflow-hidden`}
              whileHover={{ scale: 1.01 }}
              onClick={() => navigate(paths.events.detail(eventId))}
            >
              <img
                src={item.bannerUrl || item.coverUrl || fallbackImage}
                alt={item.title || item.name}
                loading="lazy"
                className="h-40 w-full object-cover"
                onError={(e) => (e.currentTarget.src = fallbackImage)}
              />
              <div className="px-4 py-3">
                <h4 className="text-base font-semibold text-gray-900">
                  {item.title || item.name}
                </h4>
                {type === 'event' && (
                  <p className="mt-1 text-sm text-gray-600">{formatDateTime(item.startAt)}</p>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
};

export default Home;
