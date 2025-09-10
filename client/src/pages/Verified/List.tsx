import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/config/api';
import { sampleVerifiedUsers } from '../../data/sampleHomeData';
import Shimmer from '../../components/Shimmer';
import VerifiedCard from '../../components/ui/VerifiedCard/VerifiedCard';
import styles from './List.module.scss';

interface VerifiedUser {
  _id: string;
  name: string;
  profession: string;
  location: string;
  bio: string;
  contact?: string;
  avatar?: string;
  rating?: number;
}

const VerifiedList = () => {
  const [users, setUsers] = useState<VerifiedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const navigate = useNavigate();

  useEffect(() => {
    api
      .get('/verified/all')
      .then((res) => {
        if (Array.isArray(res.data) && res.data.length > 0) {
          setUsers(res.data);
        } else {
          setUsers(sampleVerifiedUsers as unknown as VerifiedUser[]);
        }
      })
      .catch(() => {
        setUsers(sampleVerifiedUsers as unknown as VerifiedUser[]);
      })
      .finally(() => setLoading(false));
  }, []);

  const categories = useMemo(() => {
    const set = new Set<string>();
    users.forEach((u) => u.profession && set.add(u.profession));
    return ['All', ...Array.from(set)];
  }, [users]);

  const filtered = useMemo(
    () =>
      users.filter(
        (u) =>
          (u.name ?? '').toLowerCase().includes(search.toLowerCase()) &&
          (category === 'All' || u.profession === category)
      ),
    [users, search, category]
  );

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
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className={styles.card}>
                <Shimmer className="rounded" style={{ height: 120 }} />
                <div style={{ marginTop: '0.5rem' }}>
                  <Shimmer style={{ height: 16, width: '60%' }} />
                </div>
              </div>
            ))
          : filtered.map((user) => (
              <VerifiedCard
                key={user._id}
                user={user}
                onClick={() => navigate(`/verified-users/${user._id}`)}
              />
            ))}
      </div>
      {!loading && filtered.length === 0 && (
        <div className={styles.empty}>No verified professionals found.</div>
      )}
    </div>
  );
};

export default VerifiedList;
