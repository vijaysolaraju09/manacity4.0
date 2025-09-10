import { useEffect, useMemo, useState } from 'react';
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
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const navigate = useNavigate();

  useEffect(() => {
    if (status === 'idle') d(fetchVerified(undefined));
  }, [status, d]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    items.forEach((u) => u.profession && set.add(u.profession));
    return ['All', ...Array.from(set)];
  }, [items]);

  const filtered = useMemo(
    () =>
      items.filter(
        (u) =>
          (u.name ?? '').toLowerCase().includes(search.toLowerCase()) &&
          (category === 'All' || u.profession === category)
      ),
    [items, search, category]
  );

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
  if (status === 'succeeded' && filtered.length === 0)
    return <Empty msg='No verified professionals found.' ctaText='Refresh' onCta={() => d(fetchVerified(undefined))} />;

  return (
    <div className={styles.verifiedList}>
      <h2>Verified Professionals</h2>
      <div className={styles.filters}>
        <input
          type="text"
          placeholder="Search by name"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className={styles.categories}>
          {categories.map((cat) => (
            <button
              key={cat}
              className={cat === category ? styles.active : ''}
              onClick={() => setCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>
      <div className={styles.grid}>
        {filtered.map((user) => (
          <VerifiedCard
            key={user._id}
            user={user}
            onClick={() => navigate(`/verified-users/${user._id}`)}
          />
        ))}
      </div>
    </div>
  );
};

export default VerifiedList;
