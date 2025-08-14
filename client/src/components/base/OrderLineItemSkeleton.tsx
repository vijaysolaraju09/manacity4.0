import Shimmer from '../Shimmer';
import styles from './OrderLineItem.module.scss';

const OrderLineItemSkeleton = () => (
  <div className={styles.item}>
    <Shimmer width={64} height={64} />
    <div className={styles.info}>
      <Shimmer width="70%" height={16} style={{ marginBottom: 8 }} />
      <Shimmer width="40%" height={16} />
    </div>
    <div className={styles.actions}>
      <Shimmer width={120} height={32} />
    </div>
  </div>
);

export default OrderLineItemSkeleton;
