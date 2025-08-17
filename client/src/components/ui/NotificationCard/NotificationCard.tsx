import { ReactNode, useRef } from 'react';
import styles from './NotificationCard.module.scss';

export interface NotificationCardProps {
  icon?: string | ReactNode;
  title: string;
  message?: string;
  timestamp: string;
  read?: boolean;
  ctaLabel?: string;
  onClick?: () => void;
  onCtaClick?: () => void;
  onSwipeLeft?: () => void;
}

const NotificationCard = ({
  icon,
  title,
  message,
  timestamp,
  read,
  ctaLabel,
  onClick,
  onCtaClick,
  onSwipeLeft,
}: NotificationCardProps) => {
  const touchStart = useRef(0);

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    touchStart.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    const diff = touchStart.current - e.changedTouches[0].clientX;
    if (diff > 50 && onSwipeLeft) onSwipeLeft();
  };

  return (
    <div
      className={`${styles.card} ${read ? styles.read : ''}`}
      onClick={onClick}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {typeof icon === 'string' ? (
        <img src={icon} alt="" className={styles.icon} />
      ) : (
        icon
      )}
      <div className={styles.info}>
        <h5>{title}</h5>
        {message && <p>{message}</p>}
        <span className={styles.time}>{new Date(timestamp).toLocaleTimeString()}</span>
      </div>
      {ctaLabel && (
        <button
          type="button"
          className={styles.cta}
          onClick={(e) => {
            e.stopPropagation();
            onCtaClick?.();
          }}
        >
          {ctaLabel}
        </button>
      )}
    </div>
  );
};

export default NotificationCard;

