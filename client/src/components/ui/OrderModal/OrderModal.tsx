import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '../../../store';
import { api } from '@/config/api';
import ModalSheet from '../../base/ModalSheet';
import type { Product } from '../ProductCard';
import showToast from '../Toast';
import fallbackImage from '../../../assets/no-image.svg';
import styles from './OrderModal.module.scss';

interface OrderModalProps {
  open: boolean;
  onClose: () => void;
  product: Product | null;
  shopId: string;
}

const OrderModal = ({ open, onClose, product, shopId }: OrderModalProps) => {
  const user = useSelector((state: RootState) => state.user as any);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) setQuantity(1);
  }, [open]);

  const increment = () => setQuantity((q) => q + 1);
  const decrement = () => setQuantity((q) => Math.max(1, q - 1));

  const placeOrder = async () => {
    if (!product) return;
    try {
      setLoading(true);
      await api.post('/orders/place', {
        userId: user?._id,
        productId: product._id,
        quantity,
        shopId,
        source: 'shop-details',
      });
      showToast('Order placed', 'success');
      onClose();
    } catch {
      showToast('Failed to place order', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalSheet open={open} onClose={onClose}>
      {product && (
        <div className={styles.modal}>
          <div className={styles.product}>
            <img
              src={product.image || fallbackImage}
              alt={product.name}
              onError={(e) => (e.currentTarget.src = fallbackImage)}
            />
            <div className={styles.info}>
              <h4>{product.name}</h4>
              <p>₹{product.price}</p>
            </div>
          </div>
          <div className={styles.stepper}>
            <button onClick={decrement} aria-label="Decrease quantity">-</button>
            <span>{quantity}</span>
            <button onClick={increment} aria-label="Increase quantity">+</button>
          </div>
          <div className={styles.actions}>
            <button onClick={placeOrder} disabled={loading}>
              {loading ? 'Placing...' : 'Confirm Order'}
            </button>
          </div>
        </div>
      )}
    </ModalSheet>
  );
};

export default OrderModal;

