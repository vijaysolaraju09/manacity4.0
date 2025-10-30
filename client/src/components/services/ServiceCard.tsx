import type { ReactNode } from 'react';
import styles from './ServiceCard.module.scss';
import type { Service } from '@/types/services';

interface ServiceCardProps {
  service: Service;
  onClick?: () => void;
  footer?: ReactNode;
}

const ServiceCard = ({ service, onClick, footer }: ServiceCardProps) => {
  const rawIcon = service.icon?.trim();
  const isImageIcon = Boolean(rawIcon && /^(https?:)?\/\//.test(rawIcon));
  const icon = rawIcon && !isImageIcon ? rawIcon : service.name?.charAt(0) ?? 'S';
  const descriptor = service.description?.trim() || 'Explore providers for this service.';
  const isActive = service.isActive !== false;
  const updatedAt = service.updatedAt ?? service.createdAt;

  let updatedLabel = 'Recently added';
  if (updatedAt) {
    const date = new Date(updatedAt);
    if (!Number.isNaN(date.getTime())) {
      updatedLabel = new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium' }).format(date);
    }
  }

  return (
    <div
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      className={styles.card}
      onClick={onClick}
      onKeyDown={(event) => {
        if (!onClick) return;
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onClick();
        }
      }}
      aria-label={service.name}
    >
      <div className={styles.header}>
        <div className={styles.icon} aria-hidden="true">
          {isImageIcon ? (
            <img src={rawIcon} alt="" className={styles.iconImage} loading="lazy" />
          ) : (
            icon
          )}
        </div>
        <div className={styles.headerText}>
          <div className={styles.titleRow}>
            <div className={styles.title}>{service.name}</div>
            <span className={`${styles.badge} ${isActive ? styles.badgeActive : styles.badgeInactive}`}>
              {isActive ? 'Active' : 'Unavailable'}
            </span>
          </div>
          <span className={styles.metaLabel}>Updated {updatedLabel}</span>
        </div>
      </div>
      <p className={styles.description}>{descriptor}</p>
      <div className={styles.meta}>
        <span className={styles.metaHint}>Tap to view details</span>
        <span className={styles.metaArrow} aria-hidden="true">
          →
        </span>
      </div>
      {footer ? <div className={styles.footer}>{footer}</div> : null}
    </div>
  );
};

export default ServiceCard;
