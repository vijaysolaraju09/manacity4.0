import { useParams } from 'react-router-dom';
import { useEffect } from 'react';
import { AiFillCheckCircle, AiFillStar } from 'react-icons/ai';
import { useDispatch, useSelector } from 'react-redux';
import { fetchVerifiedById } from '@/store/verified';
import type { RootState } from '@/store';
import Shimmer from '../../components/Shimmer';
import fallbackImage from '../../assets/no-image.svg';
import styles from './VerifiedDetail.module.scss';
import ErrorCard from '@/components/common/ErrorCard';
import Empty from '@/components/common/Empty';
import { http } from '@/lib/http';
import { toItem, toErrorMessage } from '@/lib/response';
import showToast from '@/components/ui/Toast';

const VerifiedDetails = () => {
  const { id } = useParams();
  const d = useDispatch<any>();
  const { item: verified, status, error } = useSelector((s: RootState) => s.verified);

  useEffect(() => {
    if (id) d(fetchVerifiedById(id));
  }, [id, d]);

  if (status === 'loading' || !verified)
    return (
      <div className="space-y-6">
        <div className={styles.hero}>
          <Shimmer className="rounded-full" style={{ width: 96, height: 96 }} />
          <div className={styles.heroInfo}>
            <Shimmer style={{ height: 20, width: '60%', marginBottom: 8 }} />
            <Shimmer style={{ height: 16, width: '40%' }} />
            <Shimmer style={{ height: 14, width: '50%' }} />
          </div>
        </div>
        <div className={styles.bio}>
          <Shimmer style={{ height: 16, width: '80%', marginBottom: 6 }} />
          <Shimmer style={{ height: 16, width: '90%' }} />
        </div>
      </div>
    );
  if (status === 'failed')
    return <ErrorCard msg={error || 'Failed to load user'} onRetry={() => id && d(fetchVerifiedById(id))} />;
  if (status === 'succeeded' && !verified) return <Empty msg='No user found.' />;

  const handleOrder = async () => {
    if (!verified) return;
    try {
      const res = await http.post('/verified/orders', { targetId: verified._id });
      toItem(res);
      showToast('Request sent', 'success');
      window.location.assign(`tel:${verified.user.phone}`);
    } catch (err) {
      showToast(toErrorMessage(err), 'error');
    }
  };

  const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(
    verified.user.name,
  )}&background=random`;
  const portfolioImages = Array.isArray(verified.portfolio)
    ? verified.portfolio.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    : [];

  return (
    <div className="space-y-6">
      <div className={styles.hero}>
        <img
          src={avatarUrl}
          alt={verified.user.name}
          loading="lazy"
          onError={(e) => (e.currentTarget.src = fallbackImage)}
        />
        <div className={styles.heroInfo}>
          <h2 className="text-xl font-semibold text-text-primary flex items-center gap-1">
            {verified.user.name} <AiFillCheckCircle className={styles.badge} />
          </h2>
          <p className={styles.meta}>{verified.profession}</p>
          <p className={styles.meta}>{verified.user.location || 'Location not provided'}</p>
          {verified.ratingAvg && (
            <div className="flex items-center gap-1 text-sm text-text-secondary">
              <AiFillStar className="text-yellow-500" />
              <span>{verified.ratingAvg.toFixed(1)}</span>
            </div>
          )}
        </div>
      </div>

      {portfolioImages.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-text-primary">Portfolio</h3>
          <div className={styles.portfolio}>
            {portfolioImages.map((image, index) => (
              <img
                key={`${image}-${index}`}
                src={image}
                alt={`Portfolio item ${index + 1}`}
                loading="lazy"
                onError={(e) => (e.currentTarget.src = fallbackImage)}
              />
            ))}
          </div>
        </div>
      )}

      {verified.bio && (
        <div className={styles.bio}>
          <h4 className="text-lg font-semibold text-text-primary mb-2">About</h4>
          <p className="text-sm text-text-secondary leading-relaxed">{verified.bio}</p>
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
