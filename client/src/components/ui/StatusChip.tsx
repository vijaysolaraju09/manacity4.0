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
  | 'assigned'
  | 'suspended'
  | 'inactive'
  | 'upcoming'
  | 'ongoing'
  | 'past'
  | 'open'
  | 'in_progress';

interface StatusChipProps {
  status: Status;
  className?: string;
}

const StatusChip = ({ status, className = '' }: StatusChipProps) => {
  const label = status.replace(/_/g, ' ').toUpperCase();
  return <span className={`${styles.chip} ${styles[status]} ${className}`}>{label}</span>;
};

export default StatusChip;

