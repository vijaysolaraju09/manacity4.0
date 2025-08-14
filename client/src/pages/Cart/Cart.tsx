import { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  OrderLineItem,
  OrderLineItemSkeleton,
  CartSummary,
} from '../../components/base';
import { removeFromCart, updateQuantity } from '../../store/slices/cartSlice';
import type { RootState } from '../../store';
import styles from './Cart.module.scss';

const Cart = () => {
  const items = useSelector((state: RootState) => state.cart.items);
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(true);
  const [coupon, setCoupon] = useState('');
  const [discount, setDiscount] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const delivery = items.length > 0 && subtotal <= 200 ? 40 : 0;

  const applyCoupon = () => {
    if (coupon.trim().toLowerCase() === 'save10') {
      setDiscount(Math.round(subtotal * 0.1));
    } else {
      setDiscount(0);
    }
  };

  return (
    <div className={styles.cart}>
      <h2>Your Cart</h2>
      {loading ? (
        <div className={styles.list}>
          {[1, 2].map((i) => (
            <OrderLineItemSkeleton key={i} />
          ))}
        </div>
      ) : items.length === 0 ? (
        <p className={styles.empty}>Your cart is empty.</p>
      ) : (
        <div className={styles.content}>
          <div className={styles.list}>
            {items.map((it) => (
              <OrderLineItem
                key={it.id}
                image={it.image}
                title={it.name}
                price={it.price}
                quantity={it.quantity}
                onQuantityChange={(q) =>
                  dispatch(updateQuantity({ id: it.id, quantity: q }))
                }
                onRemove={() => dispatch(removeFromCart(it.id))}
              />
            ))}
          </div>
          <CartSummary
            subtotal={subtotal}
            discount={discount}
            delivery={delivery}
            coupon={coupon}
            onCouponChange={setCoupon}
            onApplyCoupon={applyCoupon}
            onCheckout={() => {
              /* placeholder */
            }}
          />
        </div>
      )}
    </div>
  );
};

export default Cart;
