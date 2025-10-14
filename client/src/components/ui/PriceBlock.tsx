import { formatINR } from '@/utils/currency';
import styles from './PriceBlock.module.scss';

interface PriceBlockProps {
  pricePaise: number;
  mrpPaise?: number;
  discountPercent?: number;
  className?: string;
}

const sanitizePaise = (value: number | undefined): number | undefined => {
  if (typeof value !== 'number') return undefined;
  if (!Number.isFinite(value)) return undefined;
  return Math.max(0, Math.round(value));
};

const PriceBlock = ({
  pricePaise,
  mrpPaise,
  discountPercent,
  className = '',
}: PriceBlockProps) => {
  const safePrice = sanitizePaise(pricePaise) ?? 0;
  const safeMrp = sanitizePaise(mrpPaise);
  const computedDiscount =
    discountPercent !== undefined
      ? discountPercent
      : safeMrp && safeMrp > 0
      ? Math.max(0, Math.round(((safeMrp - safePrice) / safeMrp) * 100))
      : undefined;

  return (
    <div className={`${styles.priceBlock} ${className}`}>
      <span className={styles.price} aria-label={`Price ${formatINR(safePrice)}`}>
        {formatINR(safePrice)}
      </span>
      {safeMrp !== undefined && (
        <span className={styles.mrp} aria-label={`MRP ${formatINR(safeMrp)}`}>
          {formatINR(safeMrp)}
        </span>
      )}
      {computedDiscount ? (
        <span className={styles.discount} aria-label={`${computedDiscount}% off`}>
          {computedDiscount}% off
        </span>
      ) : null}
    </div>
  );
};

export default PriceBlock;
