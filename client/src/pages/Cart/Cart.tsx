import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import QuantityStepper from '../../components/ui/QuantityStepper/QuantityStepper';
import PriceBlock from '../../components/ui/PriceBlock';
import EmptyState from '../../components/ui/EmptyState';
import fallbackImage from '../../assets/no-image.svg';
import { removeFromCart, updateQuantity, clearCart } from '../../store/slices/cartSlice';
import type { RootState } from '../../store';
import { http } from '@/lib/http';
import { toItem, toErrorMessage } from '@/lib/response';
import { paths } from '@/routes/paths';
import showToast from '../../components/ui/Toast';
import styles from './Cart.module.scss';

const Cart = () => {
  const items = useSelector((state: RootState) => state.cart.items);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const discount = 0;
  const fee = items.length > 0 && subtotal <= 200 ? 40 : 0;
  const total = subtotal - discount + fee;

  const handleCheckout = async () => {
    try {
      const res = await http.post('/orders', {
        items: items.map((it) => ({ productId: it.id, quantity: it.quantity })),
      });
      toItem(res);
      dispatch(clearCart());
      showToast('Order placed', 'success');
      navigate(paths.orders.mine());
    } catch (err) {
      showToast(toErrorMessage(err), 'error');
    }
  };

  if (items.length === 0) {
    return (
      <EmptyState
        image={fallbackImage}
        message="Your cart is empty"
        ctaLabel="Browse shops"
        onCtaClick={() => navigate(paths.shops())}
      />
    );
  }

  return (
    <div className={styles.cart}>
      <div className={styles.content}>
        <div className={styles.items}>
          {items.map((it) => (
            <div key={it.id} className={styles.item}>
              <img src={it.image || fallbackImage} alt={it.name} />
              <div className={styles.details}>
                <h4 className={styles.title}>{it.name}</h4>
                <PriceBlock price={it.price} />
              </div>
              <div className={styles.controls}>
                <QuantityStepper
                  value={it.quantity}
                  onChange={(q) => dispatch(updateQuantity({ id: it.id, quantity: q }))}
                  min={1}
                />
                <button
                  type="button"
                  className={styles.remove}
                  onClick={() => dispatch(removeFromCart(it.id))}
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className={styles.summary}>
          <div className={styles.row}>
            <span>Subtotal</span>
            <span>₹{subtotal}</span>
          </div>
          <div className={styles.row}>
            <span>Discount</span>
            <span>-₹{discount}</span>
          </div>
          <div className={styles.row}>
            <span>Fee</span>
            <span>₹{fee}</span>
          </div>
          <div className={`${styles.row} ${styles.total}`}>
            <span>Total</span>
            <span>₹{total}</span>
          </div>
          <button type="button" className={styles.checkout} onClick={handleCheckout}>
            Checkout
          </button>
        </div>
      </div>
    </div>
  );
};

export default Cart;
