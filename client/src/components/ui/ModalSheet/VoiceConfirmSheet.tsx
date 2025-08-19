import ModalSheet from '../../base/ModalSheet';
import styles from './VoiceConfirmSheet.module.scss';

interface Product {
  _id: string;
  name: string;
  price: number;
}

interface Shop {
  _id: string;
  name: string;
}

interface Props {
  open: boolean;
  item: { product: Product; shop: Shop; quantity: number } | null;
  loading: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

const VoiceConfirmSheet = ({ open, item, loading, onClose, onConfirm }: Props) => (
  <ModalSheet open={open} onClose={onClose}>
    {item && (
      <div className={styles.sheet}>
        <h4>Confirm Order</h4>
        <p className={styles.name}>
          {item.product.name} × {item.quantity}
        </p>
        <p className={styles.shop}>{item.shop.name}</p>
        <p className={styles.price}>₹{item.product.price * item.quantity}</p>
        <div className={styles.actions}>
          <button onClick={onConfirm} disabled={loading}>
            {loading ? 'Placing…' : 'Place Order'}
          </button>
        </div>
      </div>
    )}
  </ModalSheet>
);

export default VoiceConfirmSheet;
