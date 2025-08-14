import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AiFillCheckCircle } from 'react-icons/ai';
import api from '../../api/client';
import { sampleVerifiedUsers } from '../../data/sampleHomeData';
import Shimmer from '../../components/Shimmer';
import fallbackImage from '../../assets/no-image.svg';
import styles from './VerifiedUsers.module.scss';

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

const VerifiedUsers = () => {
  const [users, setUsers] = useState<VerifiedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('name-asc');
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

  const filtered = useMemo(
    () =>
      users.filter((u) =>
        (u.name ?? '').toLowerCase().includes(search.toLowerCase())
      ),
    [users, search]
  );

  const sorted = useMemo(() => {
    const arr = [...filtered];
    switch (sort) {
      case 'name-desc':
        return arr.sort((a, b) =>
          (b.name ?? '').localeCompare(a.name ?? '')
        );
      case 'location-asc':
        return arr.sort((a, b) =>
          (a.location ?? '').localeCompare(b.location ?? '')
        );
      case 'location-desc':
        return arr.sort((a, b) =>
          (b.location ?? '').localeCompare(a.location ?? '')
        );
      case 'name-asc':
      default:
        return arr.sort((a, b) =>
          (a.name ?? '').localeCompare(b.name ?? '')
        );
    }
  }, [filtered, sort]);

  return (
    <div className={styles.verifiedUsers}>
      <h2>Verified Professionals</h2>
      <div className={styles.filters}>
        <input
          type="text"
          placeholder="Search by name"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select value={sort} onChange={(e) => setSort(e.target.value)}>
          <option value="name-asc">Name A-Z</option>
          <option value="name-desc">Name Z-A</option>
          <option value="location-asc">Location A-Z</option>
          <option value="location-desc">Location Z-A</option>
        </select>
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
          : sorted.map((user) => (
              <motion.div
                key={user._id}
                className={styles.card}
                whileHover={{ scale: 1.02 }}
                onClick={() => navigate(`/verified-users/${user._id}`)}
              >
                <div className={styles.badge}>
                  <AiFillCheckCircle />
                </div>
                <img
                  className={styles.avatar}
                  src={
                    user.avatar ||
                    `https://ui-avatars.com/api/?name=${encodeURIComponent(
                      user.name
                    )}&background=random`
                  }
                  alt={user.name}
                  onError={(e) => (e.currentTarget.src = fallbackImage)}
                />
                <div className={styles.info}>
                  <h3>{user.name}</h3>
                  <p>{user.profession}</p>
                  <p>{user.location}</p>
                </div>
              </motion.div>
            ))}
      </div>
      {!loading && sorted.length === 0 && (
        <div className={styles.empty}>No verified professionals found.</div>
      )}
    </div>
  );
};

export default VerifiedUsers;
