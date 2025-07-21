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
import styles from './ManageProducts.module.scss';

const emptyForm: Partial<Product> = { name: '', description: '', price: 0, category: '', image: '', stock: 0, shop: '' };

const ManageProducts = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { items, loading } = useSelector((s: RootState) => s.products);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<Partial<Product>>(emptyForm);
  const [editId, setEditId] = useState<string | null>(null);

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editId) {
      dispatch(updateProduct({ id: editId, data: form }));
    } else {
      dispatch(createProduct(form));
    }
    setShowModal(false);
  };

  return (
    <div className={styles.manageProducts}>
      <h2>Manage Products</h2>
      <button onClick={openNew}>Add Product</button>
      {loading && <p>Loading...</p>}
      <div className={styles.grid}>
        {items.map((p) => (
          <div key={p._id} className={styles.card}>
            <h4>{p.name}</h4>
            <p>₹{p.price}</p>
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
            <label>
              Shop ID
              <input value={form.shop as string || ''} onChange={(e) => setForm({ ...form, shop: e.target.value })} />
            </label>
            <div className={styles.actions}>
              <button type="submit">Save</button>
              <button type="button" onClick={() => setShowModal(false)}>Cancel</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default ManageProducts;
