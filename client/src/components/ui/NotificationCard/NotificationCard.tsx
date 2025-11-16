import { useRef, useCallback } from 'react';
import type { KeyboardEvent, MouseEvent as ReactMouseEvent, ReactNode } from 'react';
import { cn } from '@/utils/cn';
import { formatTimeAgo } from '@/utils/date';
import styles from './NotificationCard.module.scss';

export interface NotificationCardProps {
  icon?: string | ReactNode;
  title?: string;
  subtitle?: string;
  message: string;
  timestamp: string;
  imageUrl?: string | null;
  ctaLabel?: string | null;
  read?: boolean;
  variant?: 'default' | 'promotion';
  onClick?: () => void;
  onSwipeLeft?: () => void;
  onCtaClick?: () => void;
}

const NotificationCard = ({
  icon,
  title,
  subtitle,
  message,
  timestamp,
  imageUrl,
  ctaLabel,
  read,
  variant = 'default',
  onClick,
  onSwipeLeft,
  onCtaClick,
}: NotificationCardProps) => {
  const touchStart = useRef(0);
  const isClickable = typeof onClick === 'function';
  const variantClass = variant === 'promotion' ? styles.promotion : styles.default;

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    touchStart.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    const diff = touchStart.current - e.changedTouches[0].clientX;
    if (diff > 50 && onSwipeLeft) onSwipeLeft();
  };

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (!onClick) return;
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        onClick();
      }
    },
    [onClick]
  );

  const handleCta = useCallback(
    (event: ReactMouseEvent<HTMLButtonElement>) => {
      event.stopPropagation();
      if (onCtaClick) {
        onCtaClick();
        return;
      }
      if (onClick) {
        onClick();
      }
    },
    [onCtaClick, onClick]
  );

  return (
    <div
      className={cn('card', styles.card, variantClass, read ? styles.read : styles.unread, {
        [styles.clickable]: isClickable,
      })}
      onClick={onClick}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onKeyDown={isClickable ? handleKeyDown : undefined}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
    >
      {variant === 'promotion' ? (
        <>
          {imageUrl ? (
            <div className={styles.banner}>
              <img src={imageUrl} alt="" loading="lazy" />
            </div>
          ) : null}
          <div className={styles.info}>
            {title ? <p className={cn(styles.title, styles.promoTitle)}>{title}</p> : null}
            <p>{message}</p>
            {subtitle ? <p className={styles.subtitle}>{subtitle}</p> : null}
            <div className={styles.footer}>
              <span className={styles.time}>{formatTimeAgo(timestamp)}</span>
              {ctaLabel ? (
                <button type="button" className={styles.ctaButton} onClick={handleCta}>
                  {ctaLabel}
                </button>
              ) : null}
            </div>
          </div>
        </>
      ) : (
        <>
          {typeof icon === 'string' ? (
            <img src={icon} alt="" className={styles.icon} />
          ) : (
            icon
          )}
          <div className={styles.info}>
            {title ? <p className={cn(styles.title, styles.defaultTitle)}>{title}</p> : null}
            <p>{message}</p>
            <span className={styles.time}>{formatTimeAgo(timestamp)}</span>
          </div>
        </>
      )}
    </div>
  );
};

export default NotificationCard;

