import styles from './EmptyState.module.scss';

interface EmptyStateProps {
  message: string;
}

const EmptyState = ({ message }: EmptyStateProps) => (
  <div className={styles.empty}>
    <p>{message}</p>
  </div>
);

export default EmptyState;
