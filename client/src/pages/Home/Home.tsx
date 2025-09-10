import './Home.scss';
import { motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/config/api';
import Shimmer from '../../components/Shimmer';
import ProductCard from '../../components/ui/ProductCard.tsx';
import SectionHeader from '../../components/ui/SectionHeader';
import HorizontalCarousel from '../../components/ui/HorizontalCarousel';
import SkeletonProductCard from '../../components/ui/Skeletons/SkeletonProductCard';
import EmptyState from '../../components/ui/EmptyState';
import {
  sampleOffers,
  sampleVerifiedUsers,
  sampleEvents,
  sampleSpecialProducts,
  banner,
} from '../../data/sampleHomeData';
import fallbackImage from '../../assets/no-image.svg';

type NavigateFn = ReturnType<typeof useNavigate>;

type SectionType = 'product' | 'user' | 'event';

const Home = () => {
  const navigate = useNavigate();

  const [offers, setOffers] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [specialProducts, setSpecialProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const fetched = useRef(false);

  useEffect(() => {
    if (fetched.current) return;
    fetched.current = true;

    Promise.all([
      api.get('/home/offers'),
      api.get('/home/verified-users'),
      api.get('/home/events'),
      api.get('/home/special-products'),
    ])
      .then(([offRes, userRes, evRes, spRes]) => {
        setOffers(
          Array.isArray(offRes.data) && offRes.data.length > 0
            ? offRes.data
            : sampleOffers,
        );
        setUsers(
          Array.isArray(userRes.data) && userRes.data.length > 0
            ? userRes.data
            : sampleVerifiedUsers,
        );
        setEvents(
          Array.isArray(evRes.data) && evRes.data.length > 0
            ? evRes.data
            : sampleEvents,
        );
        setSpecialProducts(
          Array.isArray(spRes.data) && spRes.data.length > 0
            ? spRes.data
            : sampleSpecialProducts,
        );
      })
      .catch(() => {
        setOffers(sampleOffers);
        setUsers(sampleVerifiedUsers);
        setEvents(sampleEvents);
        setSpecialProducts(sampleSpecialProducts);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="home">
      {/* Admin Banner */}
      <motion.div
        className="banner"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        onClick={() => banner.link && navigate(banner.link)}
        role={banner.link ? 'button' : undefined}
        tabIndex={banner.link ? 0 : undefined}
        aria-label={banner.title}
        onKeyDown={(e) => {
          if (banner.link && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            navigate(banner.link);
          }
        }}
      >
        <img
          src={banner.image || fallbackImage}
          alt="Admin Update"
          loading="lazy"
          width={1200}
          height={300}
          style={{ objectFit: 'cover' }}
          onError={(e) => (e.currentTarget.src = fallbackImage)}
        />
        <div className="banner-text">
          <h3>{banner.title}</h3>
          <p>{banner.subtitle}</p>
        </div>
      </motion.div>

      {/* Sections */}
      <Section
        title="Shop Offers"
        data={offers}
        type="product"
        loading={loading}
        seeAll="/shops"
        navigate={navigate}
      />
      <Section
        title="Verified Users"
        data={users}
        type="user"
        loading={loading}
        seeAll="/verified-users"
        navigate={navigate}
      />
      <Section
        title="Events"
        data={events}
        type="event"
        loading={loading}
        seeAll="/events"
        navigate={navigate}
      />
      <Section
        title="Special Shop Products"
        data={specialProducts}
        type="product"
        loading={loading}
        seeAll="/special-shop"
        navigate={navigate}
      />
    </div>
  );
};

interface SectionProps {
  title: string;
  data: any[];
  type: SectionType;
  loading: boolean;
  seeAll: string;
  navigate: NavigateFn;
}

const Section = ({ title, data, type, loading, seeAll, navigate }: SectionProps) => (
  <div className="section">
    <SectionHeader title={title} onClick={() => navigate(seeAll)} />
    {loading ? (
      <HorizontalCarousel>
        {Array.from({ length: 3 }).map((_, idx) =>
          type === 'product' ? (
            <SkeletonProductCard key={idx} />
          ) : (
            <div key={idx} className="card">
              <Shimmer className="rounded" style={{ height: 150 }} />
              <div className="card-info">
                <Shimmer style={{ height: 16, marginTop: 8, width: '60%' }} />
                {type === 'event' && (
                  <Shimmer style={{ height: 14, marginTop: 4, width: '40%' }} />
                )}
              </div>
            </div>
          ),
        )}
      </HorizontalCarousel>
    ) : data.length === 0 ? (
      <EmptyState message={`No ${title.toLowerCase()}`} />
    ) : (
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
              role="button"
              tabIndex={0}
              aria-label={`View ${item.name || item.title}`}
              onClick={() =>
                navigate(
                  type === 'user'
                    ? `/verified-users/${item._id}`
                    : `/events/${item._id}`,
                )
              }
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  navigate(
                    type === 'user'
                      ? `/verified-users/${item._id}`
                      : `/events/${item._id}`,
                  );
                }
              }}
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
                    Ends in {Math.ceil(
                      (new Date(item.startDate || item.date).getTime() - Date.now()) /
                        (1000 * 60 * 60 * 24),
                    )}{' '}
                    days
                  </p>
                )}
              </div>
            </motion.div>
          ),
        )}
      </HorizontalCarousel>
    )}
  </div>
);

export default Home;
