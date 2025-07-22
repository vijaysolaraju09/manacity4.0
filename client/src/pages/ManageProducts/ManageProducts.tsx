import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from '../../store';
import {
  fetchMyProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  type Product,
} from '../../store/slices/productSlice';
import Loader from '../../components/Loader';
import ProductCard from '../../components/ProductCard/ProductCard';
import styles from './ManageProducts.module.scss';

const emptyForm: Partial<Product> = { name: '', description: '', price: 0, category: '', image: '', stock: 0 };

const ManageProducts = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { items, loading } = useSelector((s: RootState) => s.products);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<Partial<Product>>(emptyForm);
  const [editId, setEditId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    dispatch(fetchMyProducts());
  }, [dispatch]);

  const openNew = () => {
    setForm(emptyForm);
    setEditId(null);
    setShowModal(true);
  };

  const openEdit = (p: Product) => {
    setEditId(p._id);
    setForm({ ...p });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.price || form.price <= 0) {
      alert('Please provide a name and valid price');
      return;
    }
    try {
      setSubmitting(true);
      if (editId) {
        await dispatch(updateProduct({ id: editId, data: form })).unwrap();
        alert('Product updated');
      } else {
        await dispatch(createProduct(form)).unwrap();
        alert('Product added');
      }
      setShowModal(false);
      setForm(emptyForm);
      dispatch(fetchMyProducts());
    } catch {
      alert('Failed to save product');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.manageProducts}>
      <h2>Manage Products</h2>
      <button onClick={openNew}>Add Product</button>
      {loading && <p>Loading...</p>}
      <div className={styles.grid}>
        {items.map((p) => (
          <div key={p._id} className={styles.cardWrapper}>
            <ProductCard product={p} showActions={false} />
            <div className={styles.actions}>
              <button onClick={() => openEdit(p)}>Edit</button>
              <button onClick={() => dispatch(deleteProduct(p._id))}>Delete</button>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className={styles.modal}>
          <form onSubmit={handleSubmit} className={styles.form}>
            <label>
              Name
              <input value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </label>
            <label>
              Description
              <input value={form.description || ''} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </label>
            <label>
              Price
              <input type="number" value={form.price || 0} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} />
            </label>
            <label>
              Category
              <input value={form.category || ''} onChange={(e) => setForm({ ...form, category: e.target.value })} />
            </label>
            <label>
              Image URL
              <input value={form.image || ''} onChange={(e) => setForm({ ...form, image: e.target.value })} />
            </label>
            <label>
              Stock
              <input type="number" value={form.stock || 0} onChange={(e) => setForm({ ...form, stock: Number(e.target.value) })} />
            </label>
            <div className={styles.actions}>
              <button type="submit" disabled={submitting}>
                {submitting ? <Loader /> : 'Save'}
              </button>
              <button type="button" onClick={() => setShowModal(false)} disabled={submitting}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default ManageProducts;
