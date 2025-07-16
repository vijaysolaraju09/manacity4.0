import { useSelector, useDispatch } from 'react-redux';
import { removeFromCart } from '../../store/slices/cartSlice';
import type { RootState } from '../../store';
import styles from './Cart.module.scss';

const Cart = () => {
  const items = useSelector((state: RootState) => state.cart.items);
  const dispatch = useDispatch();
  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return (
    <div className={styles.cart}>
      <h2>Your Cart</h2>
      {items.length === 0 ? (
        <p className={styles.empty}>Your cart is empty.</p>
      ) : (
        <>
          <div className={styles.list}>
            {items.map((it) => (
              <div key={it.id} className={styles.item}>
                {it.image && <img src={it.image} alt={it.name} />}
                <div className={styles.info}>
                  <h4>{it.name}</h4>
                  <span>₹{it.price} × {it.quantity}</span>
                </div>
                <button onClick={() => dispatch(removeFromCart(it.id))}>
                  Remove
                </button>
              </div>
            ))}
          </div>
          <div className={styles.total}>Total: ₹{total}</div>
        </>
      )}
    </div>
  );
};

export default Cart;
