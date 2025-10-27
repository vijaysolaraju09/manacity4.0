import { AiFillStar } from 'react-icons/ai';
import type { ReactNode } from 'react';
import styles from './ProviderCard.module.scss';
import getImageOrPlaceholder from '@/utils/getImageOrPlaceholder';
import type { ServiceProvider } from '@/types/services';

interface ProviderCardProps {
  provider: ServiceProvider;
  actions?: ReactNode;
}

const ProviderCard = ({ provider, actions }: ProviderCardProps) => {
  const user = provider.user;
  const name = user?.name ?? 'Service provider';
  const location = user?.location ?? '';
  const phone = user?.phone ?? '';
  const ratingAvg = typeof provider.ratingAvg === 'number' ? provider.ratingAvg : undefined;
  const ratingCount = typeof provider.ratingCount === 'number' ? provider.ratingCount : undefined;
  const avatarUrl = getImageOrPlaceholder(
    user?.avatarUrl ||
      (name
        ? `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random&size=128`
        : ''),
  );

  return (
    <div className={styles.card}>
      <img
        src={avatarUrl}
        alt={name}
        className={styles.avatar}
        onError={(event) => {
          const placeholder = getImageOrPlaceholder(null);
          if (event.currentTarget.src !== placeholder) {
            event.currentTarget.src = placeholder;
          }
        }}
      />
      <div className={styles.info}>
        <div className={styles.name}>{name}</div>
        <div className={styles.meta}>
          {provider.profession || user?.profession ? (
            <div>{provider.profession || user?.profession}</div>
          ) : null}
          {provider.bio || user?.bio ? (
            <div className={styles.note}>{provider.bio || user?.bio}</div>
          ) : null}
          {location ? <div>{location}</div> : null}
          {phone ? <div>{phone}</div> : null}
        </div>
        <div className={styles.actions}>
          <span className={styles.badge}>
            <AiFillStar aria-hidden="true" />
            {typeof ratingAvg === 'number' ? ratingAvg.toFixed(1) : 'Not rated'}
            {typeof ratingCount === 'number' && ratingCount > 0 ? ` (${ratingCount})` : ''}
          </span>
          {provider.source ? <span className={styles.badge}>Source: {provider.source}</span> : null}
        </div>
        {actions ? <div className={styles.actions}>{actions}</div> : null}
      </div>
    </div>
  );
};

export default ProviderCard;
