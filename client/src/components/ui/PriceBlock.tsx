import styles from './PriceBlock.module.scss';

interface PriceBlockProps {
  price: number;
  mrp?: number;
  discount?: number;
  className?: string;
}

const PriceBlock = ({ price, mrp, discount, className = '' }: PriceBlockProps) => {
  const computedDiscount =
    discount !== undefined
      ? discount
      : mrp
      ? Math.round(((mrp - price) / mrp) * 100)
      : undefined;

  return (
    <div className={`${styles.priceBlock} ${className}`}>
      <span className={styles.price} aria-label={`Price ₹${price}`}>
        ₹{price}
      </span>
      {mrp && (
        <span className={styles.mrp} aria-label={`MRP ₹${mrp}`}>
          ₹{mrp}
        </span>
      )}
      {computedDiscount && (
        <span
          className={styles.discount}
          aria-label={`${computedDiscount}% off`}
        >
          {computedDiscount}% off
        </span>
      )}
    </div>
  );
};

export default PriceBlock;
