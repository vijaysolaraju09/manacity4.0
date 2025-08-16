import Shimmer from '../../Shimmer';
import styles from '../ProductCard/ProductCard.module.scss';

const SkeletonProductCard = () => (
  <div className={styles.card}>
    <div className={styles.imageWrapper}>
      <Shimmer style={{ width: '100%', height: '100%' }} />
    </div>
    <div className={styles.info}>
      <Shimmer style={{ height: 16, marginBottom: 8, width: '70%' }} />
      <Shimmer style={{ height: 16, width: '40%' }} />
    </div>
  </div>
);

export default SkeletonProductCard;
