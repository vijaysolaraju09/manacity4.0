import { formatINR } from '@/utils/currency';
import styles from './CartSummary.module.scss';

export interface CartSummaryProps {
  subtotalPaise: number;
  discountPaise: number;
  deliveryPaise: number;
  coupon: string;
  onCouponChange: (c: string) => void;
  onApplyCoupon: () => void;
  onCheckout: () => void;
}

const CartSummary = ({
  subtotalPaise,
  discountPaise,
  deliveryPaise,
  coupon,
  onCouponChange,
  onApplyCoupon,
  onCheckout,
}: CartSummaryProps) => {
  const totalPaise = subtotalPaise - discountPaise + deliveryPaise;
  return (
    <div className={styles.summary}>
      <div className={styles.coupon}>
        <input
          type="text"
          placeholder="Coupon code"
          value={coupon}
          onChange={(e) => onCouponChange(e.target.value)}
        />
        <button type="button" onClick={onApplyCoupon} aria-label="Apply coupon">
          Apply
        </button>
      </div>
      <div className={styles.row}>
        <span>Subtotal</span>
        <span>{formatINR(subtotalPaise)}</span>
      </div>
      {discountPaise > 0 && (
        <div className={styles.row}>
          <span>Discount</span>
          <span>-{formatINR(discountPaise)}</span>
        </div>
      )}
      <div className={styles.row}>
        <span>Delivery</span>
        <span>{formatINR(deliveryPaise)}</span>
      </div>
      <div className={styles.total}>
        <span>Total</span>
        <span>{formatINR(totalPaise)}</span>
      </div>
      <button type="button" className={styles.checkout} onClick={onCheckout}>
        Checkout
      </button>
    </div>
  );
};

export default CartSummary;
