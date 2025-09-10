import './Home.scss';
import { motion } from 'framer-motion';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import ProductCard from '../../components/ui/ProductCard.tsx';
import SectionHeader from '../../components/ui/SectionHeader';
import HorizontalCarousel from '../../components/ui/HorizontalCarousel';
import Empty from '../../components/ui/EmptyState';
import { fetchShops } from '@/store/shops';
import { fetchVerified } from '@/store/verified';
import { fetchEvents } from '@/store/events';
import { fetchSpecialProducts } from '@/store/products';
import type { RootState } from '@/store';
import EventsSkeleton from '@/components/common/EventsSkeleton';
import ShopsSkeleton from '@/components/common/ShopsSkeleton';
import ProductsSkeleton from '@/components/common/ProductsSkeleton';
import ErrorCard from '@/components/common/ErrorCard';
import fallbackImage from '../../assets/no-image.svg';

const Home = () => {
  const navigate = useNavigate();
  const d = useDispatch<any>();

  const shops = useSelector((s: RootState) => s.shops);
  const verified = useSelector((s: RootState) => s.verified);
  const events = useSelector((s: RootState) => s.events);
  const products = useSelector((s: RootState) => s.catalog);

  useEffect(() => {
    if (shops.status === 'idle') d(fetchShops({ sort: '-createdAt', pageSize: 10 }));
    if (verified.status === 'idle') d(fetchVerified({ pageSize: 10 }));
    if (events.status === 'idle') d(fetchEvents({ pageSize: 10 }));
    if (products.status === 'idle') d(fetchSpecialProducts({ pageSize: 10 }));
  }, [shops.status, verified.status, events.status, products.status, d]);

  return (
    <div className="home">
      <motion.div
        className="banner"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <img
          src={fallbackImage}
          alt="Banner"
          loading="lazy"
          width={1200}
          height={300}
          style={{ objectFit: 'cover' }}
        />
        <div className="banner-text">
          <h3>Welcome to ManaCity</h3>
          <p>Discover shops, events and more</p>
        </div>
      </motion.div>

      <Section
        title="Shop Offers"
        data={shops.items}
        status={shops.status}
        error={shops.error}
        type="product"
        onRetry={() => d(fetchShops({ sort: '-createdAt', pageSize: 10 }))}
        navigate={navigate}
      />
      <Section
        title="Verified Users"
        data={verified.items}
        status={verified.status}
        error={verified.error}
        type="user"
        onRetry={() => d(fetchVerified({ pageSize: 10 }))}
        navigate={navigate}
      />
      <Section
        title="Events"
        data={events.items}
        status={events.status}
        error={events.error}
        type="event"
        onRetry={() => d(fetchEvents({ pageSize: 10 }))}
        navigate={navigate}
      />
      <Section
        title="Special Shop Products"
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
  data: any[];
  status: string;
  error: string | null;
  type: 'product' | 'user' | 'event';
  onRetry: () => void;
  navigate: ReturnType<typeof useNavigate>;
}

const Section = ({ title, data, status, error, type, onRetry, navigate }: SectionProps) => {
  const loading = status === 'loading';
  if (loading)
    return (
      <div className="section">
        <SectionHeader title={title} onClick={() => navigate(`/${title.toLowerCase().replace(/ /g, '-')}`)} />
        {type === 'product' ? <ProductsSkeleton /> : type === 'event' ? <EventsSkeleton /> : <ShopsSkeleton />}
      </div>
    );
  if (status === 'failed')
    return (
      <div className="section">
        <SectionHeader title={title} onClick={() => navigate(`/${title.toLowerCase().replace(/ /g, '-')}`)} />
        <ErrorCard msg={error || `Failed to load ${title}`} onRetry={onRetry} />
      </div>
    );
  if (status === 'succeeded' && data.length === 0)
    return (
      <div className="section">
        <SectionHeader title={title} onClick={() => navigate(`/${title.toLowerCase().replace(/ /g, '-')}`)} />
        <Empty message={`No ${title.toLowerCase()}`} />
      </div>
    );
  return (
    <div className="section">
      <SectionHeader title={title} onClick={() => navigate(`/${title.toLowerCase().replace(/ /g, '-')}`)} />
      <HorizontalCarousel>
        {data.map((item: any) =>
          type === 'product' ? (
            <ProductCard
              key={item._id}
              product={item}
              onClick={() => navigate(`/product/${item._id}`)}
            />
          ) : (
            <motion.div
              key={item._id}
              className="card"
              whileHover={{ scale: 1.03 }}
              onClick={() =>
                navigate(
                  type === 'user'
                    ? `/verified-users/${item._id}`
                    : `/events/${item._id}`
                )
              }
            >
              <img
                src={item.image || fallbackImage}
                alt={item.name || item.title}
                loading="lazy"
                width={150}
                height={150}
                style={{ objectFit: 'cover', aspectRatio: '1 / 1' }}
                onError={(e) => (e.currentTarget.src = fallbackImage)}
              />
              <div className="card-info">
                <h4>{item.name || item.title}</h4>
                {type === 'event' && (
                  <p>
                    Ends in {Math.ceil((new Date(item.startDate || item.date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))} days
                  </p>
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
