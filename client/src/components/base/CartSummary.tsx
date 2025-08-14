import styles from './CartSummary.module.scss';

export interface CartSummaryProps {
  subtotal: number;
  discount: number;
  delivery: number;
  coupon: string;
  onCouponChange: (c: string) => void;
  onApplyCoupon: () => void;
  onCheckout: () => void;
}

const CartSummary = ({
  subtotal,
  discount,
  delivery,
  coupon,
  onCouponChange,
  onApplyCoupon,
  onCheckout,
}: CartSummaryProps) => {
  const total = subtotal - discount + delivery;
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
        <span>₹{subtotal}</span>
      </div>
      {discount > 0 && (
        <div className={styles.row}>
          <span>Discount</span>
          <span>-₹{discount}</span>
        </div>
      )}
      <div className={styles.row}>
        <span>Delivery</span>
        <span>₹{delivery}</span>
      </div>
      <div className={styles.total}>
        <span>Total</span>
        <span>₹{total}</span>
      </div>
      <button type="button" className={styles.checkout} onClick={onCheckout}>
        Checkout
      </button>
    </div>
  );
};

export default CartSummary;
