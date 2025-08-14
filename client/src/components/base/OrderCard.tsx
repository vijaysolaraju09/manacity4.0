import { motion } from 'framer-motion';
import PriceBlock from './PriceBlock';
import styles from './OrderCard.module.scss';

export interface OrderCardProps {
  order: any;
  onCancel?: () => void;
  onAccept?: () => void;
  onReject?: () => void;
  className?: string;
}

const OrderCard = ({ order, onCancel, onAccept, onReject, className = '' }: OrderCardProps) => {
  return (
    <motion.div whileHover={{ scale: 1.01 }} className={`${styles.card} ${className}`}>
      {order.product?.image && (
        <img src={order.product.image} alt={order.product.name} style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 'var(--radius-sm)' }} />
      )}
      <div className={styles.info}>
        <h4>{order.product?.name}</h4>
        {order.product?.shop?.name && <p>{order.product.shop.name}</p>}
        <PriceBlock price={order.product?.price || 0} />
        <p>Qty: {order.quantity}</p>
        <p>{new Date(order.createdAt).toLocaleDateString()}</p>
      </div>
      <span className={styles.status}>{order.status}</span>
      {(onCancel || onAccept || onReject) && (
        <div className={styles.actions}>
          {onCancel && <button onClick={onCancel}>Cancel</button>}
          {onAccept && <button onClick={onAccept}>Accept</button>}
          {onReject && <button onClick={onReject}>Reject</button>}
        </div>
      )}
    </motion.div>
  );
};

export default OrderCard;
