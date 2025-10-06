import type { ReactNode } from 'react';
import styles from './ErrorCard.module.scss';

interface ErrorCardProps {
  title?: string;
  message: string;
  retryLabel?: string;
  onRetry?: () => void;
  actions?: ReactNode;
}

const ErrorCard = ({
  title = 'Something went wrong',
  message,
  retryLabel = 'Retry',
  onRetry,
  actions,
}: ErrorCardProps) => (
  <div className={styles.card} role="alert">
    {title && <h3 className={styles.title}>{title}</h3>}
    <p className={styles.message}>{message}</p>
    {(onRetry || actions) && (
      <div className={styles.actions}>
        {onRetry && (
          <button type="button" className={styles.retry} onClick={onRetry}>
            {retryLabel}
          </button>
        )}
        {actions}
      </div>
    )}
  </div>
);

export default ErrorCard;
