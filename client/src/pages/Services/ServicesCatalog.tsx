import { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import styles from './ServicesCatalog.module.scss';
import SkeletonList from '@/components/ui/SkeletonList';
import ErrorCard from '@/components/ui/ErrorCard';
import Button from '@/components/ui/button';
import ServiceCard from '@/components/services/ServiceCard';
import { fetchServices } from '@/store/services';
import type { RootState, AppDispatch } from '@/store';
import { paths } from '@/routes/paths';

const ServicesCatalog = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const servicesState = useSelector((state: RootState) => state.services);
  const [q, setQ] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');

  useEffect(() => {
    const id = window.setTimeout(() => setDebouncedQ(q.trim().toLowerCase()), 300);
    return () => window.clearTimeout(id);
  }, [q]);

  useEffect(() => {
    if (servicesState.status === 'idle') {
      dispatch(fetchServices(undefined));
    }
  }, [servicesState.status, dispatch]);

  const items = Array.isArray(servicesState.items) ? servicesState.items : [];
  const activeCount = items.filter((service) => service.isActive !== false).length;
  const upcomingCount = Math.max(0, items.length - activeCount);

  const filteredServices = useMemo(() => {
    if (!Array.isArray(items)) return [] as typeof items;
    if (!debouncedQ) return items;
    return items.filter((service) => {
      const label = (service?.name || service?.description || '').toLowerCase();
      return label.includes(debouncedQ);
    });
  }, [items, debouncedQ]);

  const handleRetry = () => {
    dispatch(fetchServices(undefined));
  };

  const handleRequestService = () => {
    navigate(paths.services.request());
  };

  const subtitle = items.length
    ? `Browse ${items.length} curated services from local experts in your community.`
    : 'Browse curated services from local experts in your community.';

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.headerText}>
          <h2 className={styles.title}>Service catalog</h2>
          <p className={styles.subtitle}>{subtitle}</p>
        </div>
        <div className={styles.headerActions}>
          <Button size="sm" onClick={handleRequestService}>
            Request a Service
          </Button>
          <Button size="sm" variant="secondary" onClick={handleRetry}>
            Refresh
          </Button>
        </div>
      </div>

      <div className={styles.searchWrapper}>
        <input
          type="text"
          value={q}
          onChange={(event) => setQ(event.target.value)}
          placeholder="Search services…"
          className={styles.searchInput}
          aria-label="Search services"
        />
      </div>

      {servicesState.status === 'loading' ? (
        <SkeletonList count={6} />
      ) : servicesState.status === 'failed' ? (
        <ErrorCard message={servicesState.error || 'Failed to load services'} onRetry={handleRetry} />
      ) : items.length === 0 ? (
        <div className={styles.empty}>
          <p>No services have been added yet.</p>
          <div className={styles.actions}>
            <Button onClick={handleRequestService}>Request a Service</Button>
            <Button variant="secondary" onClick={handleRetry}>
              Refresh
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div className={styles.stats} role="list">
            <div className={styles.statCard} role="listitem">
              <span className={styles.statLabel}>Active services</span>
              <span className={styles.statValue}>{activeCount}</span>
              <span className={styles.statHint}>Ready to request today</span>
            </div>
            <div className={styles.statCard} role="listitem">
              <span className={styles.statLabel}>Coming soon</span>
              <span className={styles.statValue}>{upcomingCount}</span>
              <span className={styles.statHint}>We&apos;re onboarding more providers</span>
            </div>
          </div>
          <div className={styles.grid}>
            {filteredServices.map((service) => (
              <ServiceCard
                key={service._id}
                service={service}
                to={paths.services.detail(service._id)}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default ServicesCatalog;
