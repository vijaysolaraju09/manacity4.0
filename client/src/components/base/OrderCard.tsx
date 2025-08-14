import PriceBlock from './PriceBlock';
import StatusChip, { type Status } from '../ui/StatusChip';
import styles from './OrderCard.module.scss';

export interface OrderItem {
  id: string;
  title: string;
  image: string;
}

export interface OrderCardProps {
  items: OrderItem[];
  shop: string;
  date: string; // ISO string
  status: Status;
  quantity: number;
  total: number;
  onAccept?: () => void;
  onReject?: () => void;
  onCall?: () => void;
  className?: string;
}

const OrderCard = ({
  items,
  shop,
  date,
  status,
  quantity,
  total,
  onAccept,
  onReject,
  onCall,
  className = '',
}: OrderCardProps) => (
  <div className={`${styles.card} ${className}`}>
    <div className={styles.thumbs}>
      {items.slice(0, 3).map((item) => (
        <img key={item.id} src={item.image} alt={item.title} />
      ))}
    </div>
    <div className={styles.info}>
      <h4>{shop}</h4>
      <p className={styles.date}>{new Date(date).toLocaleDateString()}</p>
      <p className={styles.qty}>Qty: {quantity}</p>
      <PriceBlock price={total} />
    </div>
    <StatusChip status={status} className={styles.status} />
    {(onAccept || onReject || onCall) && (
      <div className={styles.actions}>
        {onCall && (
          <button type="button" onClick={onCall} aria-label="Call shop">
            Call
          </button>
        )}
        {onAccept && (
          <button type="button" onClick={onAccept} aria-label="Accept order">
            Accept
          </button>
        )}
        {onReject && (
          <button type="button" onClick={onReject} aria-label="Reject order">
            Reject
          </button>
        )}
      </div>
    )}
  </div>
);

export default OrderCard;
