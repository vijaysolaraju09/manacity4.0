import { useRef } from 'react';
import type { ReactNode } from 'react';
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
        <p>{message}</p>
        <span className={styles.time}>{new Date(timestamp).toLocaleTimeString()}</span>
      </div>
    </div>
  );
};

export default NotificationCard;

