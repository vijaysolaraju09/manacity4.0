import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import styles from './Verified.module.scss';
import fallbackImage from '@/assets/no-image.svg';
import { fetchVerified } from '@/store/verified';
import type { RootState } from '@/store';
import type { VerifiedCard } from '@/types/verified';
import EmptyState from '@/components/ui/EmptyState';
import ErrorCard from '@/components/ui/ErrorCard';
import SkeletonList from '@/components/ui/SkeletonList';

const VerifiedList = () => {
  const d = useDispatch<any>();
  const { items, status, error } = useSelector((s: RootState) => s.verified);
  const [profession, setProfession] = useState('');
  const [location, setLocation] = useState('');
  const navigate = useNavigate();

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

  const safeItems = useMemo(() => {
    if (!Array.isArray(items)) return [] as VerifiedCard[];

    return (items as Array<Record<string, unknown>>)
      .map((raw, index) => {
        if (!raw || typeof raw !== 'object') return null;

        const rawUser =
          raw.user && typeof raw.user === 'object' ? (raw.user as Record<string, unknown>) : {};

        const idSource = [raw._id, raw.id, rawUser._id].find(
          (value) => typeof value === 'string' && value.trim().length > 0,
        );
        const id = (idSource as string | undefined) ?? `verified-${index}`;

        const name =
          typeof rawUser.name === 'string' && rawUser.name.trim().length > 0
            ? rawUser.name.trim()
            : 'Unnamed professional';

        const location =
          typeof rawUser.location === 'string' && rawUser.location.trim().length > 0
            ? rawUser.location.trim()
            : undefined;

        const profession =
          typeof raw.profession === 'string' && raw.profession.trim().length > 0
            ? raw.profession.trim()
            : '';

        const portfolio = Array.isArray(raw.portfolio)
          ? raw.portfolio.filter((entry) => typeof entry === 'string' && entry.trim().length > 0)
          : [];

        return {
          id,
          _id: id,
          user: {
            _id:
              (typeof rawUser._id === 'string' && rawUser._id.trim().length > 0
                ? rawUser._id.trim()
                : id) || id,
            name,
            phone: typeof rawUser.phone === 'string' ? rawUser.phone : '',
            location,
            address:
              typeof rawUser.address === 'string' && rawUser.address.trim().length > 0
                ? rawUser.address.trim()
                : undefined,
          },
          profession,
          bio: typeof raw.bio === 'string' ? raw.bio : '',
          portfolio,
          status:
            raw.status === 'approved' || raw.status === 'rejected'
              ? (raw.status as VerifiedCard['status'])
              : 'pending',
          ratingAvg: typeof raw.ratingAvg === 'number' ? raw.ratingAvg : 0,
          ratingCount: typeof raw.ratingCount === 'number' ? raw.ratingCount : 0,
          createdAt: typeof raw.createdAt === 'string' ? raw.createdAt : undefined,
          updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : undefined,
        } satisfies VerifiedCard;
      })
      .filter(Boolean) as VerifiedCard[];
  }, [items]);
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
    return (
      <div className={styles.grid}>
        {safeItems.map((v) => {
          const professionTags = (v.profession || '')
            .split(/[,/]/)
            .map((tag) => tag.trim())
            .filter((tag) => tag.length > 0);
          const tags =
            professionTags.length > 0
              ? professionTags
              : v.profession
              ? [v.profession]
              : ['Profession not provided'];
          const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(
            v.user.name,
          )}&background=random`;
          const locationLabel = v.user.location || 'Location not provided';
          return (
            <button
              key={v._id}
              type="button"
              className={styles.card}
              onClick={() => navigate(`/verified-users/${v._id}`)}
            >
              <img
                className={styles.avatar}
                src={avatarUrl}
                alt={v.user.name}
                loading="lazy"
                onError={(event) => {
                  event.currentTarget.src = fallbackImage;
                }}
              />
              <div className={styles.details}>
                <h3 className={styles.title}>{v.user.name}</h3>
                <p className={styles.meta}>{locationLabel}</p>
                <div className={styles.tags}>
                  {tags.map((tag) => (
                    <span key={`${v._id}-${tag}`}>{tag}</span>
                  ))}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    );
  })();

  return (
    <div className={styles.page}>
      <h2 className="text-2xl font-semibold text-gray-900">Verified Professionals</h2>
      <div className={styles.filters}>
        <input
          type="text"
          placeholder="Profession"
          value={profession}
          onChange={(e) => setProfession(e.target.value)}
          className="flex-1 rounded-lg border border-gray-300 px-3 py-2"
        />
        <input
          type="text"
          placeholder="Location"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          className="flex-1 rounded-lg border border-gray-300 px-3 py-2"
        />
      </div>
      {content}
    </div>
  );
};

export default VerifiedList;
