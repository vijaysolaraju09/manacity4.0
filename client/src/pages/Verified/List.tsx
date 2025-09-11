import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import Shimmer from '../../components/Shimmer';
import VerifiedCard from '../../components/ui/VerifiedCard/VerifiedCard';
import styles from './List.module.scss';
import { fetchVerified } from '@/store/verified';
import type { RootState } from '@/store';
import ErrorCard from '@/components/common/ErrorCard';
import Empty from '@/components/common/Empty';

const VerifiedList = () => {
  const d = useDispatch<any>();
  const { items, status, error } = useSelector((s: RootState) => s.verified);
  const [profession, setProfession] = useState('');
  const [location, setLocation] = useState('');
  const navigate = useNavigate();

  const cards = useMemo(
    () =>
      items.map((user) => (
        <VerifiedCard
          key={user._id}
          user={user}
          onClick={() => navigate(`/verified-users/${user._id}`)}
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
      if (profession) params.profession = profession;
      if (location) params.location = location;
      d(fetchVerified(params));
    }, 300);
    return () => clearTimeout(handle);
  }, [profession, location, d]);

  if (status === 'loading')
    return (
      <div className={styles.grid}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className={styles.card}>
            <Shimmer className="rounded" style={{ height: 120 }} />
            <div style={{ marginTop: '0.5rem' }}>
              <Shimmer style={{ height: 16, width: '60%' }} />
            </div>
          </div>
        ))}
      </div>
    );
  if (status === 'failed')
    return <ErrorCard msg={error || 'Failed to load verified users'} onRetry={() => d(fetchVerified(undefined))} />;
  if (status === 'succeeded' && items.length === 0)
    return <Empty msg='No verified professionals found.' ctaText='Refresh' onCta={() => d(fetchVerified(undefined))} />;

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
      <div className={styles.grid}>{cards}</div>
    </div>
  );
};

export default VerifiedList;
