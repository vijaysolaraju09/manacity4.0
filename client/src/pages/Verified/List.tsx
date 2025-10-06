import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import VerifiedCard from '../../components/ui/VerifiedCard/VerifiedCard';
import styles from './List.module.scss';
import { fetchVerified } from '@/store/verified';
import type { RootState } from '@/store';
import EmptyState from '@/components/ui/EmptyState';
import ErrorCard from '@/components/ui/ErrorCard';
import SkeletonList from '@/components/ui/SkeletonList';

const VerifiedList = () => {
  const d = useDispatch<any>();
  const { items, status, error } = useSelector((s: RootState) => s.verified);
  const [profession, setProfession] = useState('');
  const [location, setLocation] = useState('');
  const navigate = useNavigate();

  const cards = useMemo(
    () =>
      (items ?? []).map((v) => (
        <VerifiedCard
          key={v._id}
          card={v}
          onClick={() => navigate(`/verified-users/${v._id}`)}
        />
      )),
    [items, navigate]
  );

  useEffect(() => {
    if (status === 'idle') d(fetchVerified(undefined));
  }, [status, d]);

  useEffect(() => {
    const handle = setTimeout(() => {
      const params: Record<string, string> = {};
      if (profession) params.q = profession;
      if (location) params.location = location;
      d(fetchVerified(params));
    }, 300);
    return () => clearTimeout(handle);
  }, [profession, location, d]);

  const safeItems = items ?? [];
  const isLoading = status === 'loading';
  const hasError = status === 'failed';
  const hasItems = safeItems.length > 0;

  const content = (() => {
    if (isLoading) {
      return (
        <SkeletonList
          count={4}
          lines={3}
          withAvatar
          className={styles.skeletonGrid}
          itemClassName={styles.cardSkeleton}
        />
      );
    }
    if (hasError) {
      return (
        <ErrorCard
          message={error || 'Failed to load verified users'}
          onRetry={() => {
            void d(fetchVerified(undefined));
          }}
        />
      );
    }
    if (!hasItems) {
      return (
        <EmptyState
          title="No verified professionals"
          message="We couldn't find any verified professionals matching your filters right now. Try refreshing to load the latest profiles."
          ctaLabel="Refresh"
          onCtaClick={() => {
            void d(fetchVerified(undefined));
          }}
        />
      );
    }
    return <div className={styles.grid}>{cards}</div>;
  })();

  return (
    <div className={styles.verifiedList}>
      <h2>Verified Professionals</h2>
      <div className={styles.filters}>
        <input
          type="text"
          placeholder="Profession"
          value={profession}
          onChange={(e) => setProfession(e.target.value)}
        />
        <input
          type="text"
          placeholder="Location"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
        />
      </div>
      {content}
    </div>
  );
};

export default VerifiedList;
