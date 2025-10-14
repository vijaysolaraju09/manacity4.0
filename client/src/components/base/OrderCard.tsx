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
  totalPaise: number;
  phone?: string;
  onAccept?: () => void;
  onReject?: () => void;
  onCancel?: () => void;
  onCall?: () => void;
  onReorder?: () => void;
  className?: string;
}

const OrderCard = ({
  items,
  shop,
  date,
  status,
  quantity,
  totalPaise,
  phone,
  onAccept,
  onReject,
  onCancel,
  onCall,
  onReorder,
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
      <PriceBlock pricePaise={totalPaise} />
    </div>
    <StatusChip status={status} className={styles.status} />
    {(onAccept || onReject || onCancel || onCall || onReorder || phone) && (
      <div className={styles.actions}>
        {phone && <span className={styles.phone}>{phone}</span>}
        {onCall && (
          <button type="button" onClick={onCall} aria-label="Call buyer">
            Call
          </button>
        )}
        {onReorder && (
          <button type="button" onClick={onReorder} aria-label="Reorder">
            Reorder
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
        {onCancel && (
          <button type="button" onClick={onCancel} aria-label="Cancel order">
            Cancel
          </button>
        )}
      </div>
    )}
  </div>
);

export default OrderCard;
