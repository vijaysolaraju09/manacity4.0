import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AiFillCheckCircle, AiFillStar } from 'react-icons/ai';
import api from '../../api/client';
import { sampleVerifiedUsers } from '../../data/sampleHomeData';
import Shimmer from '../../components/Shimmer';
import Loader from '../../components/Loader';
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
  const [professionFilter, setProfessionFilter] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [requestingId, setRequestingId] = useState('');
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

  const professions = useMemo(
    () => Array.from(new Set(users.map((u) => u.profession).filter(Boolean))),
    [users]
  );
  const locations = useMemo(
    () => Array.from(new Set(users.map((u) => u.location).filter(Boolean))),
    [users]
  );

  const filtered = users.filter((u) => {
    return (
      (!professionFilter || u.profession === professionFilter) &&
      (!locationFilter || u.location === locationFilter) &&
      u.name.toLowerCase().includes(search.toLowerCase())
    );
  });

  const requestService = async (id: string) => {
    try {
      setRequestingId(id);
      await api.post(`/verified/interest/${id}`);
      alert('Request sent');
    } catch {
      alert('Failed to request');
    } finally {
      setRequestingId('');
    }
  };

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
        <select
          value={professionFilter}
          onChange={(e) => setProfessionFilter(e.target.value)}
        >
          <option value="">All Professions</option>
          {professions.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        <select
          value={locationFilter}
          onChange={(e) => setLocationFilter(e.target.value)}
        >
          <option value="">All Locations</option>
          {locations.map((l) => (
            <option key={l} value={l}>
              {l}
            </option>
          ))}
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
          : filtered.map((user) => (
              <motion.div
                key={user._id}
                className={styles.card}
                whileHover={{ scale: 1.02 }}
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
                  onClick={() => navigate(`/verified-users/${user._id}`)}
                />
                <div className={styles.info}>
                  <h3>{user.name}</h3>
                  <p>{user.profession}</p>
                  <p>{user.location}</p>
                  {user.rating && (
                    <div className={styles.rating}>
                      {Array.from({ length: 5 }).map((_, i) => (
                        <AiFillStar
                          key={i}
                          color={i < user.rating! ? '#fbbf24' : '#ddd'}
                        />
                      ))}
                    </div>
                  )}
                </div>
                <div className={styles.bio}>{user.bio}</div>
                <div className={styles.actions}>
                  {user.contact && (
                    <a
                      href={`https://wa.me/${user.contact}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Contact on WhatsApp
                    </a>
                  )}
                  <button
                    onClick={() => requestService(user._id)}
                    disabled={requestingId === user._id}
                  >
                    {requestingId === user._id ? <Loader /> : 'Request Service'}
                  </button>
                </div>
              </motion.div>
            ))}
      </div>
    </div>
  );
};

export default VerifiedUsers;
