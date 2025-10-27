import { useCallback, useEffect, useMemo, useState, memo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { Building2, MapPin, PhoneCall, Search, Star } from 'lucide-react';
import type { AppDispatch, RootState } from '@/store';
import { fetchVerified } from '@/store/verified';
import type { VerifiedCard } from '@/types/verified';
import EmptyState from '@/components/ui/EmptyState';
import ErrorCard from '@/components/ui/ErrorCard';
import SkeletonList from '@/components/ui/SkeletonList';
import fallbackImage from '@/assets/no-image.svg';
import { paths } from '@/routes/paths';
import { cn } from '@/lib/utils';
import styles from './ProvidersPage.module.scss';

const PAGE_SIZE = 24;

const normalizeProviders = (items: unknown[]): VerifiedCard[] =>
  items
    .map((raw, index) => {
      if (!raw || typeof raw !== 'object') return null;
      const entry = raw as Record<string, any>;
      const rawUser =
        entry.user && typeof entry.user === 'object' ? (entry.user as Record<string, any>) : {};
      const idSource = [entry._id, entry.id, rawUser._id]
        .map((value) => (typeof value === 'string' ? value.trim() : null))
        .find((value) => value && value.length > 0);

      const id = idSource ?? `provider-${index}`;
      const name =
        typeof rawUser.name === 'string' && rawUser.name.trim().length > 0
          ? rawUser.name.trim()
          : 'Unnamed professional';
      const profession =
        typeof entry.profession === 'string' && entry.profession.trim().length > 0
          ? entry.profession.trim()
          : undefined;
      const ratingAvg =
        typeof entry.ratingAvg === 'number' ? entry.ratingAvg : Number(entry.rating?.avg);
      const ratingCount =
        typeof entry.ratingCount === 'number' ? entry.ratingCount : Number(entry.rating?.count);
      const phone = typeof rawUser.phone === 'string' ? rawUser.phone.trim() : '';

      return {
        id,
        _id: id,
        user: {
          _id: id,
          name,
          phone,
          location:
            typeof rawUser.location === 'string' && rawUser.location.trim().length > 0
              ? rawUser.location.trim()
              : undefined,
          address:
            typeof rawUser.address === 'string' && rawUser.address.trim().length > 0
              ? rawUser.address.trim()
              : undefined,
        },
        profession: profession ?? '',
        bio: typeof entry.bio === 'string' ? entry.bio : '',
        portfolio: Array.isArray(entry.portfolio) ? entry.portfolio : [],
        status: 'approved',
        ratingAvg: Number.isFinite(ratingAvg) ? ratingAvg : undefined,
        ratingCount: Number.isFinite(ratingCount) ? ratingCount : undefined,
        createdAt: typeof entry.createdAt === 'string' ? entry.createdAt : undefined,
        updatedAt: typeof entry.updatedAt === 'string' ? entry.updatedAt : undefined,
      } satisfies VerifiedCard;
    })
    .filter(Boolean) as VerifiedCard[];

type ProviderCardProps = {
  provider: VerifiedCard;
  onViewProfile: (id: string) => void;
};

const ProviderCard = memo(({ provider, onViewProfile }: ProviderCardProps) => {
  const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(provider.user.name)}&background=0B3C8A&color=FFFFFF`;
  const displayImage = (provider as any)?.avatarUrl || provider.portfolio?.[0] || avatarUrl;
  const ratingLabel =
    provider.ratingAvg && provider.ratingCount
      ? `${provider.ratingAvg.toFixed(1)} out of 5 stars based on ${provider.ratingCount} reviews`
      : 'No reviews yet';
  const phoneNumber = provider.user.phone?.replace(/\s+/g, '');

  return (
    <li className={styles.card}>
      <article className={styles.cardBody}>
        <button
          type="button"
          className={styles.cardMedia}
          onClick={() => onViewProfile(provider._id)}
          aria-label={`View ${provider.user.name}'s profile`}
        >
          <img
            src={displayImage || fallbackImage}
            alt={provider.user.name}
            loading="lazy"
            onError={(event) => {
              event.currentTarget.src = fallbackImage;
            }}
          />
        </button>
        <div className={styles.cardContent}>
          <h2 className={styles.cardTitle}>{provider.user.name}</h2>
          <p className={styles.cardProfession}>
            <Building2 className={styles.cardIcon} aria-hidden="true" />
            {provider.profession || 'Profession not provided'}
          </p>
          {provider.user.location ? (
            <p className={styles.cardLocation}>
              <MapPin className={styles.cardIcon} aria-hidden="true" />
              {provider.user.location}
            </p>
          ) : null}
          <div className={styles.cardMeta}>
            <span className={styles.rating} aria-label={ratingLabel}>
              <Star className={styles.ratingIcon} aria-hidden="true" />
              {provider.ratingAvg ? provider.ratingAvg.toFixed(1) : 'New'}
              {provider.ratingCount ? (
                <span className={styles.ratingCount}>({provider.ratingCount})</span>
              ) : null}
            </span>
            <a
              className={cn(styles.callButton, !phoneNumber && styles.callButtonDisabled)}
              href={phoneNumber ? `tel:${phoneNumber}` : undefined}
              aria-label={phoneNumber ? `Call ${provider.user.name}` : 'Phone number unavailable'}
              onClick={(event) => {
                if (!phoneNumber) event.preventDefault();
              }}
            >
              <PhoneCall className={styles.callIcon} aria-hidden="true" />
              <span>Call</span>
            </a>
          </div>
        </div>
      </article>
    </li>
  );
});

ProviderCard.displayName = 'ProviderCard';

const ProvidersPage = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { items, status, error } = useSelector((state: RootState) => state.verified);
  const userRole = useSelector((state: RootState) => state.auth.user?.role);
  const isBusiness = userRole === 'business';
  const [profession, setProfession] = useState('');
  const [city, setCity] = useState('');

  useEffect(() => {
    if (!isBusiness || status !== 'idle') return;
    dispatch(fetchVerified(undefined));
  }, [dispatch, isBusiness, status]);

  useEffect(() => {
    if (!isBusiness) return;
    const handle = window.setTimeout(() => {
      const params: Record<string, string> = {};
      if (profession.trim()) params.q = profession.trim();
      if (city.trim()) params.location = city.trim();
      dispatch(fetchVerified(params));
    }, 300);
    return () => window.clearTimeout(handle);
  }, [dispatch, profession, city, isBusiness]);

  const providers = useMemo(() => {
    if (!Array.isArray(items)) return [];
    return normalizeProviders(items);
  }, [items]);

  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [providers, profession, city]);

  const limitedProviders = useMemo(
    () => providers.slice(0, visibleCount),
    [providers, visibleCount],
  );

  const showLoadMore = providers.length > visibleCount;

  const handleLoadMore = useCallback(() => {
    setVisibleCount((count) => Math.min(count + PAGE_SIZE, providers.length));
  }, [providers.length]);

  if (!isBusiness) {
    return (
      <section className={styles.page} aria-labelledby="providers-heading">
        <header className={styles.header}>
          <h1 id="providers-heading" className={styles.heading}>
            Verified providers
          </h1>
          <p className={styles.subtitle}>
            Service providers are available only to approved business accounts. Request business verification to explore
            the directory.
          </p>
        </header>
        <EmptyState
          title="Business access required"
          message="Switch to a business account to discover verified professionals and manage your service collaborations."
          ctaLabel="Go to profile"
          onCtaClick={() => navigate(paths.profile())}
        />
      </section>
    );
  }

  const isLoading = status === 'loading';
  const hasError = status === 'failed';
  const hasProviders = providers.length > 0;

  const handleViewProfile = useCallback(
    (id: string) => {
      navigate(paths.providers.detail(id));
    },
    [navigate],
  );

  return (
    <section className={styles.page} aria-labelledby="providers-heading">
      <header className={styles.header}>
        <div>
          <h1 id="providers-heading" className={styles.heading}>
            Verified providers
          </h1>
          <p className={styles.subtitle}>
            Browse trusted professionals verified by the Manacity team. Reach out directly to collaborate on service
            requests.
          </p>
        </div>
        <div className={styles.filters}>
          <label className={styles.filterField} htmlFor="provider-profession">
            <span className={styles.filterLabel}>Profession</span>
            <div className={styles.inputWrapper}>
              <Search className={styles.inputIcon} aria-hidden="true" />
              <input
                id="provider-profession"
                type="text"
                value={profession}
                onChange={(event) => setProfession(event.target.value)}
                placeholder="e.g., Electrician"
              />
            </div>
          </label>
          <label className={styles.filterField} htmlFor="provider-city">
            <span className={styles.filterLabel}>City</span>
            <div className={styles.inputWrapper}>
              <MapPin className={styles.inputIcon} aria-hidden="true" />
              <input
                id="provider-city"
                type="text"
                value={city}
                onChange={(event) => setCity(event.target.value)}
                placeholder="e.g., Hyderabad"
              />
            </div>
          </label>
        </div>
      </header>
      <div className={styles.content}>
        {isLoading && !hasProviders ? (
          <SkeletonList count={6} lines={5} className={styles.skeleton} />
        ) : null}
        {hasError ? (
          <ErrorCard message={error ?? 'Unable to load providers'} onRetry={() => dispatch(fetchVerified(undefined))} />
        ) : null}
        {!isLoading && !hasError && !hasProviders ? (
          <EmptyState
            title="No providers found"
            message="Try adjusting your filters or refresh the list to discover more verified professionals."
            ctaLabel="Refresh"
            onCtaClick={() => dispatch(fetchVerified(undefined))}
          />
        ) : null}
        {hasProviders ? (
          <>
            <ul className={styles.grid} aria-live="polite">
              {limitedProviders.map((provider) => (
                <ProviderCard key={provider._id} provider={provider} onViewProfile={handleViewProfile} />
              ))}
            </ul>
            {showLoadMore ? (
              <div className={styles.loadMoreRow}>
                <button type="button" className={styles.loadMoreButton} onClick={handleLoadMore}>
                  Load more providers
                </button>
              </div>
            ) : null}
          </>
        ) : null}
      </div>
    </section>
  );
};

export default ProvidersPage;
