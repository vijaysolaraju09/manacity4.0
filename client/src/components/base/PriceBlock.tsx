import styles from './PriceBlock.module.scss';

export interface PriceBlockProps {
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
    <div className={`${styles.price} ${className}`}>
      <span className={styles.current}>₹{price}</span>
      {mrp && <span className={styles.mrp}>₹{mrp}</span>}
      {computedDiscount && (
        <span className={styles.discount}>{computedDiscount}% off</span>
      )}
    </div>
  );
};

export default PriceBlock;
