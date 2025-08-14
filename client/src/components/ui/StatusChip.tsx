import styles from './StatusChip.module.scss';

export type Status = 'pending' | 'accepted' | 'rejected' | 'cancelled';

interface StatusChipProps {
  status: Status;
  className?: string;
}

const StatusChip = ({ status, className = '' }: StatusChipProps) => (
  <span className={`${styles.chip} ${styles[status]} ${className}`}>{status}</span>
);

export default StatusChip;

