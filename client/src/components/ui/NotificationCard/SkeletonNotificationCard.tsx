import Shimmer from '../../Shimmer';
import styles from './NotificationCard.module.scss';

const SkeletonNotificationCard = () => (
  <div className={styles.card}>
    <Shimmer width={40} height={40} className={styles.icon} />
    <div className={styles.info}>
      <Shimmer style={{ height: 14, width: '70%' }} />
    </div>
  </div>
);

export default SkeletonNotificationCard;

