import { FaShoppingCart } from 'react-icons/fa';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import type { RootState } from '@/store';
import styles from './FloatingCart.module.scss';

const FloatingCart = () => {
  const count = useSelector((s: RootState) => s.cart.items.length);
  const navigate = useNavigate();
  if (count === 0) return null;
  return (
    <button
      type="button"
      className={styles.cart}
      onClick={() => navigate('/cart')}
      aria-label="Cart"
    >
      <FaShoppingCart />
      <span className={styles.badge}>{count}</span>
    </button>
  );
};

export default FloatingCart;
