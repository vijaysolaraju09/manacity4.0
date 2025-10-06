import styles from './StatusChip.module.scss';

export type Status =
  | 'pending'
  | 'accepted'
  | 'rejected'
  | 'cancelled'
  | 'completed'
  | 'placed'
  | 'confirmed'
  | 'preparing'
  | 'ready'
  | 'out_for_delivery'
  | 'delivered'
  | 'returned'
  | 'draft'
  | 'approved'
  | 'active'
  | 'suspended'
  | 'inactive'
  | 'upcoming'
  | 'ongoing'
  | 'past';

interface StatusChipProps {
  status: Status;
  className?: string;
}

const StatusChip = ({ status, className = '' }: StatusChipProps) => (
  <span className={`${styles.chip} ${styles[status]} ${className}`}>{status}</span>
);

export default StatusChip;

