import { useRef } from 'react';
import type { ReactNode } from 'react';
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

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    touchStart.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    const diff = touchStart.current - e.changedTouches[0].clientX;
    if (diff > 50 && onSwipeLeft) onSwipeLeft();
  };

  return (
    <div
      className={cn('card', styles.card, read ? styles.read : styles.unread)}
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
        <p>{message}</p>
        <span className={styles.time}>{formatTimeAgo(timestamp)}</span>
      </div>
    </div>
  );
};

export default NotificationCard;

