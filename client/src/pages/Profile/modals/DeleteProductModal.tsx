import ModalSheet from '../../../components/base/ModalSheet';
import styles from '../Profile.module.scss';

interface Props {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

const DeleteProductModal = ({ open, onClose, onConfirm }: Props) => (
  <ModalSheet open={open} onClose={onClose}>
    <div className={styles.confirm}>
      <p>Remove this product?</p>
      <div className={styles.modalActions}>
        <button type="button" onClick={onClose}>
          Cancel
        </button>
        <button type="button" onClick={onConfirm}>
          Remove
        </button>
      </div>
    </div>
  </ModalSheet>
);

export default DeleteProductModal;

