import styles from './EmptyState.module.scss';

interface EmptyStateProps {
  title?: string;
  message: string;
  image?: string;
  ctaLabel?: string;
  onCtaClick?: () => void;
}

const EmptyState = ({ title, message, image, ctaLabel, onCtaClick }: EmptyStateProps) => (
  <div className={styles.empty}>
    {image && <img src={image} alt="" className={styles.image} />}
    {title && <h3 className={styles.title}>{title}</h3>}
    <p className={styles.message}>{message}</p>
    {ctaLabel && onCtaClick && (
      <button type="button" className={styles.cta} onClick={onCtaClick}>
        {ctaLabel}
      </button>
    )}
  </div>
);

export default EmptyState;
