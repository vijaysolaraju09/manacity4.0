import { useRef, useCallback } from 'react';
import type { KeyboardEvent, ReactNode } from 'react';
import { cn } from '@/utils/cn';
import { formatTimeAgo } from '@/utils/date';
import styles from './NotificationCard.module.scss';

export interface NotificationCardProps {
  icon?: string | ReactNode;
  message: string;
  timestamp: string;
  read?: boolean;
  onClick?: () => void;
  onSwipeLeft?: () => void;
}

const NotificationCard = ({
  icon,
  message,
  timestamp,
  read,
  onClick,
  onSwipeLeft,
}: NotificationCardProps) => {
  const touchStart = useRef(0);
  const isClickable = typeof onClick === 'function';

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

  return (
    <div
      className={cn('card', styles.card, read ? styles.read : styles.unread, {
        [styles.clickable]: isClickable,
      })}
      onClick={onClick}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onKeyDown={isClickable ? handleKeyDown : undefined}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
    >
      {typeof icon === 'string' ? (
        <img src={icon} alt="" className={styles.icon} />
      ) : (
        icon
      )}
      <div className={styles.info}>
        <p>{message}</p>
        <span className={styles.time}>{formatTimeAgo(timestamp)}</span>
      </div>
    </div>
  );
};

export default NotificationCard;

