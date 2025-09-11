import { useParams } from 'react-router-dom';
import { useEffect } from 'react';
import { AiFillCheckCircle, AiFillStar } from 'react-icons/ai';
import { useDispatch, useSelector } from 'react-redux';
import { fetchVerifiedById } from '@/store/verified';
import type { RootState } from '@/store';
import Shimmer from '../../components/Shimmer';
import fallbackImage from '../../assets/no-image.svg';
import styles from './Details.module.scss';
import ErrorCard from '@/components/common/ErrorCard';
import Empty from '@/components/common/Empty';
import { http } from '@/lib/http';
import showToast from '@/components/ui/Toast';

const VerifiedDetails = () => {
  const { id } = useParams();
  const d = useDispatch<any>();
  const { item: user, status, error } = useSelector((s: RootState) => s.verified);

  useEffect(() => {
    if (id) d(fetchVerifiedById(id));
  }, [id, d]);

  if (status === 'loading' || !user)
    return (
      <div className={styles.details}>
        <div className={styles.header}>
          <Shimmer className="rounded" style={{ width: 120, height: 120 }} />
          <div className={styles.info}>
            <Shimmer style={{ height: 20, width: '60%', marginBottom: 8 }} />
            <Shimmer style={{ height: 16, width: '40%' }} />
          </div>
        </div>
        <div className={styles.bio} style={{ marginTop: '2rem' }}>
          <Shimmer style={{ height: 16, width: '80%', marginBottom: 6 }} />
          <Shimmer style={{ height: 16, width: '90%' }} />
        </div>
      </div>
    );
  if (status === 'failed')
    return <ErrorCard msg={error || 'Failed to load user'} onRetry={() => id && d(fetchVerifiedById(id))} />;
  if (status === 'succeeded' && !user) return <Empty msg='No user found.' />;

  const handleOrder = async () => {
    if (!user) return;
    try {
      await http.post('/verified/orders', { targetId: user._id });
      showToast('Request sent', 'success');
      window.location.href = `tel:${user.phone}`;
    } catch {
      showToast('Failed to send request', 'error');
    }
  };

  return (
    <div className={styles.details}>
      <div className={styles.header}>
        <img
          src={
            user.avatarUrl ||
            `https://ui-avatars.com/api/?name=${user.name}&background=random`
          }
          alt={user.name}
          onError={(e) => (e.currentTarget.src = fallbackImage)}
        />
        <div className={styles.info}>
          <h2>
            {user.name} <AiFillCheckCircle className={styles.badge} />
          </h2>
          <p>{user.profession}</p>
          <p>{user.location}</p>
          {user.rating && (
            <div className={styles.rating}>
              <AiFillStar />
              <span>{user.rating.toFixed(1)}</span>
            </div>
          )}
        </div>
      </div>

      {user.bio && (
        <div className={styles.bio}>
          <h4>About</h4>
          <p>{user.bio}</p>
        </div>
      )}

      {user.stats && (
        <div className={styles.stats}>
          <h4>Stats</h4>
          <ul>
            {Object.entries(user.stats).map(([k, v]) => (
              <li key={k}>
                <strong>{v as any}</strong>
                <span>{k}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {user.reviews && user.reviews.length > 0 && (
        <div className={styles.reviews}>
          <h4>Reviews</h4>
          {user.reviews.map((review: any) => (
            <div key={review._id} className={styles.review}>
              <div className={styles.reviewHeader}>
                <span>{review.reviewer}</span>
                <div className={styles.reviewRating}>
                  <AiFillStar />
                  <span>{review.rating}</span>
                </div>
              </div>
              <p>{review.comment}</p>
            </div>
          ))}
        </div>
      )}

      <div className={styles.contactButtons}>
        <button type="button" onClick={handleOrder}>
          Call to Order
        </button>
      </div>
    </div>
  );
};

export default VerifiedDetails;
