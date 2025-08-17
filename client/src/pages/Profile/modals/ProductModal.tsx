import { useEffect, useState } from 'react';
import ModalSheet from '../../../components/base/ModalSheet';
import styles from '../Profile.module.scss';

export interface ProductForm {
  _id?: string;
  name: string;
  price: number;
  image?: string;
}

interface Props {
  open: boolean;
  initial?: ProductForm | null;
  onClose: () => void;
  onSave: (data: ProductForm) => void;
}

const empty: ProductForm = { name: '', price: 0, image: '' };

const ProductModal = ({ open, initial, onClose, onSave }: Props) => {
  const [form, setForm] = useState<ProductForm>(empty);

  useEffect(() => {
    setForm(initial || empty);
  }, [initial, open]);

  return (
    <ModalSheet open={open} onClose={onClose}>
      <form
        className={styles.productForm}
        onSubmit={(e) => {
          e.preventDefault();
          onSave(form);
        }}
      >
        <h3>{initial ? 'Edit' : 'Add'} Product</h3>
        <label>
          Name
          <input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
        </label>
        <label>
          Price
          <input
            type="number"
            value={form.price}
            onChange={(e) =>
              setForm({ ...form, price: Number(e.target.value) })
            }
            required
            min={0}
          />
        </label>
        <label>
          Image URL
          <input
            value={form.image || ''}
            onChange={(e) => setForm({ ...form, image: e.target.value })}
          />
        </label>
        <div className={styles.modalActions}>
          <button type="button" onClick={onClose}>
            Cancel
          </button>
          <button type="submit">{initial ? 'Update' : 'Add'}</button>
        </div>
      </form>
    </ModalSheet>
  );
};

export default ProductModal;

