import styles from './EmptyState.module.scss';

interface EmptyStateProps {
  message: string;
  image?: string;
  ctaLabel?: string;
  onCtaClick?: () => void;
}

const EmptyState = ({ message, image, ctaLabel, onCtaClick }: EmptyStateProps) => (
  <div className={styles.empty}>
    {image && <img src={image} alt="" className={styles.image} />}
    <p>{message}</p>
    {ctaLabel && onCtaClick && (
      <button type="button" className={styles.cta} onClick={onCtaClick}>
        {ctaLabel}
      </button>
    )}
  </div>
);

export default EmptyState;
