import styles from './Home.module.scss';
import { motion } from 'framer-motion';
import { Mic } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import SpecialProductCard from '@/components/specials/SpecialProductCard';
import SectionHeader from '../../components/ui/SectionHeader';
import EmptyState from '../../components/ui/EmptyState';
import { fetchShops } from '@/store/shops';
import { fetchServices } from '@/store/services';
import { createEventsQueryKey, fetchEvents } from '@/store/events.slice';
import { fetchSpecialProducts, type Product as SpecialProduct } from '@/store/products';
import { http } from '@/lib/http';
import { toErrorMessage } from '@/lib/response';
import type { RootState } from '@/store';
import EventsSkeleton from '@/components/common/EventsSkeleton';
import ShopsSkeleton from '@/components/common/ShopsSkeleton';
import ProductsSkeleton from '@/components/common/ProductsSkeleton';
import ErrorCard from '@/components/ui/ErrorCard';
import SkeletonList from '@/components/ui/SkeletonList';
import fallbackImage from '../../assets/no-image.svg';
import { formatDateTime } from '@/utils/date';
import ServiceCard from '@/components/services/ServiceCard';
import { paths } from '@/routes/paths';
import {
  getSpecialProductDetailsTarget,
  isSpecialProductCallToOrder,
} from '@/utils/specialProducts';
import ShopCard from '@/components/ui/ShopCard/ShopCard';
import Button from '@/components/ui/button';
import HorizontalCarousel from '@/components/ui/HorizontalCarousel';

interface Announcement {
  _id: string;
  title: string;
  text: string;
  image?: string | null;
  ctaText?: string | null;
  ctaLink?: string | null;
  active: boolean;
}

const Home = () => {
  const navigate = useNavigate();
  const d = useDispatch<any>();

  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [announcementStatus, setAnnouncementStatus] = useState<'idle' | 'loading' | 'succeeded' | 'failed'>('idle');
  const [announcementError, setAnnouncementError] = useState<string | null>(null);

  const shops = useSelector((s: RootState) => s.shops);
  const services = useSelector((s: RootState) => s.services);
  const eventsList = useSelector((s: RootState) => s.events.list);
  const products = useSelector((s: RootState) => s.catalog);

  const featuredEventsParams = useMemo(
    () => ({ pageSize: 4 }),
    [],
  );
  const featuredEventsKey = useMemo(
    () => createEventsQueryKey(featuredEventsParams),
    [featuredEventsParams],
  );

  const pendingFeaturedEventsAbort = useRef<(() => void) | null>(null);

  const loadAnnouncement = useCallback(async () => {
    setAnnouncementStatus('loading');
    setAnnouncementError(null);
    try {
      const res = await http.get('/home/announcement');
      const item = (res?.data?.announcement ?? null) as Announcement | null;
      setAnnouncement(item);
      setAnnouncementStatus('succeeded');
    } catch (err) {
      setAnnouncement(null);
      setAnnouncementStatus('failed');
      setAnnouncementError(toErrorMessage(err));
    }
  }, []);

  useEffect(() => {
    if (announcementStatus === 'idle') {
      void loadAnnouncement();
    }
  }, [announcementStatus, loadAnnouncement]);

  const handleAnnouncementCta = useCallback(
    (item: Announcement) => {
      if (!item.ctaLink) return;
      if (/^https?:/i.test(item.ctaLink)) {
        window.open(item.ctaLink, '_blank', 'noopener');
        return;
      }

      const target = item.ctaLink.startsWith('/') ? item.ctaLink : `/${item.ctaLink}`;
      navigate(target);
    },
    [navigate]
  );

  useEffect(() => {
    if (shops.status === 'idle') d(fetchShops({ sort: '-createdAt', pageSize: 10 }));
    if (services.status === 'idle') d(fetchServices(undefined));
    if (products.status === 'idle') d(fetchSpecialProducts({ pageSize: 10 }));
  }, [shops.status, services.status, products.status, d]);

  const reloadFeaturedEvents = useCallback(() => {
    pendingFeaturedEventsAbort.current?.();
    const promise = d(fetchEvents(featuredEventsParams));
    pendingFeaturedEventsAbort.current = () => {
      promise.abort?.();
    };
  }, [d, featuredEventsParams]);

  useEffect(() => {
    const itemCount = eventsList.items?.length ?? 0;
    if (eventsList.loading && eventsList.queryKey === featuredEventsKey) return;

    if (eventsList.queryKey !== featuredEventsKey || itemCount === 0) {
      reloadFeaturedEvents();
    }
  }, [eventsList.loading, eventsList.queryKey, eventsList.items?.length, featuredEventsKey, reloadFeaturedEvents]);

  useEffect(
    () => () => {
      pendingFeaturedEventsAbort.current?.();
    },
    [],
  );

  return (
    <div className="space-y-12">
      {announcementStatus === 'loading' ? (
        <section className="px-4 md:px-6 lg:px-8">
          <div className="animate-pulse overflow-hidden surface-2">
            <div className="h-44 bg-surface-2 md:h-56" />
          </div>
        </section>
      ) : announcementStatus === 'failed' ? (
        <section className="px-4 md:px-6 lg:px-8">
          <div className="surface-2 flex flex-col gap-3 px-4 py-3 text-sm text-md md:flex-row md:items-center md:justify-between">
            <span>{announcementError || 'Failed to load announcement.'}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                void loadAnnouncement();
              }}
            >
              Retry
            </Button>
          </div>
        </section>
      ) : announcement ? (
        <section className="px-4 md:px-6 lg:px-8">
          <div className="card flex flex-col overflow-hidden md:flex-row">
            <div className="md:w-2/5">
              {announcement.image ? (
                <img
                  src={announcement.image}
                  alt={announcement.title}
                  loading="lazy"
                  className="h-56 w-full object-cover md:h-full"
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = fallbackImage;
                  }}
                />
              ) : (
                <div className="h-40 w-full bg-gradient-to-br from-[color:var(--brand-500)]/18 via-[color:var(--accent-500)]/18 to-purple-500/10 md:h-full" />
              )}
            </div>
            <div className="flex flex-1 flex-col justify-center gap-4 p-6 text-hi">
              <div className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-brand-500">
                  Announcement
                </span>
                <h2 className="text-2xl font-extrabold text-hi">{announcement.title}</h2>
                <p className="text-sm text-md">{announcement.text}</p>
              </div>
              {announcement.ctaText && announcement.ctaLink ? (
                <div>
                  <Button size="lg" onClick={() => handleAnnouncementCta(announcement)}>
                    {announcement.ctaText}
                  </Button>
                </div>
              ) : null}
            </div>
          </div>
        </section>
      ) : null}

      <section className={`${styles.hero}`}>
        <div className="space-y-8 px-4 md:px-6 lg:px-8">
          <motion.div
            className={`card overflow-hidden px-4 py-6 text-hi shadow-elev2 md:px-6 lg:px-8`}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex flex-col gap-3">
                <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-md">
                  <Mic className="icon h-4 w-4 text-brand-500" aria-hidden="true" /> Voice Order
                </span>
                <h2 className="text-2xl font-extrabold text-hi">Speak groceries into your cart</h2>
                <p className="max-w-2xl text-sm text-md">
                  Talk to Manacity in Telugu, Hindi or English. We instantly parse your request, surface matching products across neighbourhood shops and let you checkout from one place.
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <Button className="gap-2" size="lg" onClick={() => navigate(paths.voiceOrder())}>
                  <Mic className="icon h-4 w-4" aria-hidden="true" /> Try Voice Order
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
            <ul className="mt-6 flex flex-wrap gap-3 text-xs text-md">
              <li className="chip">“oka kilo tomatolu”</li>
              <li className="chip">“2 kg bendakayalu”</li>
              <li className="chip">“tomato one kilo”</li>
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
        title="Services"
        path={paths.services.catalog()}
        data={services.items}
        status={services.status}
        error={services.error}
        type="service"
        onRetry={() => d(fetchServices(undefined))}
        navigate={navigate}
        linkLabel="See all services"
      />
      <Section
        title="Events"
        path={paths.events.list()}
        data={eventsList.items ?? []}
        status={
          eventsList.loading
            ? 'loading'
            : eventsList.error
            ? 'failed'
            : (eventsList.items?.length ?? 0) > 0
            ? 'succeeded'
            : 'idle'
        }
        error={eventsList.error}
        type="event"
        onRetry={reloadFeaturedEvents}
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
  type: 'product' | 'event' | 'shop' | 'service';
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
  const handleSpecialDetails = (selected: SpecialProduct) => {
    const target = getSpecialProductDetailsTarget(selected);
    if (!target) return;
    if (/^https?:/i.test(target)) {
      window.open(target, '_blank', 'noopener');
      return;
    }
    navigate(target);
  };
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
        ) : type === 'service' ? (
          <SkeletonList count={4} />
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
      <HorizontalCarousel>
        {items.map((item: any) => {
          if (type === 'product') {
            const product = item as SpecialProduct;

            return (
              <SpecialProductCard
                key={product._id}
                product={product}
                onDetails={
                  isSpecialProductCallToOrder(product) ? undefined : handleSpecialDetails
                }
              />
            );
          }

          if (type === 'service') {
            return (
              <ServiceCard
                key={item._id}
                service={item}
                onClick={() => navigate(paths.services.detail(item._id))}
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
              className={`card overflow-hidden text-hi`}
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
                <h4 className="text-base font-semibold text-hi">
                  {item.title || item.name}
                </h4>
                {type === 'event' && (
                  <p className="mt-1 text-sm text-md">{formatDateTime(item.startAt)}</p>
                )}
              </div>
            </motion.div>
          );
        })}
      </HorizontalCarousel>
    </section>
  );
};

export default Home;
