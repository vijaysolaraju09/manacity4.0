import { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { http } from '@/lib/http';
import { toItems, toErrorMessage } from '@/lib/response';
import type { RootState, AppDispatch } from '../../store';
import {
  fetchMyProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  type Product,
  type CreateProductPayload,
  type UpdateProductPayload,
} from '../../store/slices/productSlice';
import Loader from '../../components/Loader';
import ProductCard from '../../components/ui/ProductCard.tsx';
import showToast from '../../components/ui/Toast';
import styles from './ManageProducts.module.scss';

type ProductFormState = {
  shopId: string;
  name: string;
  description: string;
  price: number;
  mrp: number;
  category: string;
  imageUrl: string;
  stock: number;
};

type ShopSummary = {
  id?: string;
  _id?: string;
  name: string;
  status?: string;
};

const emptyForm: ProductFormState = {
  shopId: '',
  name: '',
  description: '',
  price: 0,
  mrp: 0,
  category: '',
  imageUrl: '',
  stock: 0,
};

const ManageProducts = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { items, loading } = useSelector((s: RootState) => s.products);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<ProductFormState>(emptyForm);
  const [editId, setEditId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [shops, setShops] = useState<ShopSummary[]>([]);
  const [shopsLoading, setShopsLoading] = useState(false);

  const defaultShopId = useMemo(() => {
    if (!shops.length) return '';
    const approved = shops.find((s) => s.status === 'approved');
    const target = approved ?? shops[0];
    return target?._id || target?.id || '';
  }, [shops]);

  useEffect(() => {
    dispatch(fetchMyProducts());
  }, [dispatch]);

  useEffect(() => {
    let active = true;
    const loadShops = async () => {
      try {
        setShopsLoading(true);
        const res = await http.get('/shops/my');
        const data = (toItems(res) ?? []) as ShopSummary[];
        if (!active) return;
        setShops(data);
      } catch (err) {
        if (active) {
          showToast(toErrorMessage(err), 'error');
        }
      } finally {
        if (active) {
          setShopsLoading(false);
        }
      }
    };
    loadShops();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!defaultShopId) return;
    setForm((prev) => {
      if (prev.shopId) return prev;
      return { ...prev, shopId: defaultShopId };
    });
  }, [defaultShopId]);

  const resetForm = () => {
    setForm((prev) => ({ ...emptyForm, shopId: prev.shopId || defaultShopId }));
    setEditId(null);
  };

  const openNew = () => {
    setForm((prev) => ({ ...emptyForm, shopId: prev.shopId || defaultShopId }));
    setEditId(null);
    setShowModal(true);
  };

  const openEdit = (p: Product) => {
    setEditId(p._id);
    setForm({
      shopId: p.shopId || p.shop || defaultShopId,
      name: p.name || '',
      description: p.description || '',
      price: typeof p.price === 'number' ? p.price : 0,
      mrp: typeof p.mrp === 'number' ? p.mrp : 0,
      category: p.category || '',
      imageUrl: p.image || '',
      stock: typeof p.stock === 'number' ? p.stock : 0,
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.shopId) {
      showToast('Select a shop for this product', 'error');
      return;
    }
    if (!form.name || !form.price || form.price <= 0) {
      showToast('Please provide a name and valid price', 'error');
      return;
    }
    if (!form.mrp || form.mrp <= 0) {
      showToast('Please provide a valid MRP', 'error');
      return;
    }
    if (form.price > form.mrp) {
      showToast('Price cannot exceed MRP', 'error');
      return;
    }
    const pricePaise = Math.round(form.price * 100);
    const mrpPaise = Math.round(form.mrp * 100);
    if (!Number.isInteger(pricePaise) || !Number.isInteger(mrpPaise)) {
      showToast('Price and MRP must be valid amounts', 'error');
      return;
    }
    try {
      setSubmitting(true);
      const payloadBase = {
        name: form.name.trim(),
        description: form.description.trim(),
        pricePaise,
        mrpPaise,
        category: form.category.trim(),
        imageUrl: form.imageUrl.trim() || undefined,
        stock: Number.isFinite(form.stock) ? form.stock : 0,
      } satisfies Omit<CreateProductPayload, 'shopId'>;

      if (editId) {
        const updatePayload: UpdateProductPayload = {
          ...payloadBase,
          shopId: form.shopId,
        };
        await dispatch(updateProduct({ id: editId, data: updatePayload })).unwrap();
        showToast('Product updated');
      } else {
        const createPayload: CreateProductPayload = {
          ...payloadBase,
          shopId: form.shopId,
        };
        await dispatch(createProduct(createPayload)).unwrap();
        showToast('Product added');
      }
      setShowModal(false);
      resetForm();
      window.dispatchEvent(new Event('productsUpdated'));
    } catch (err) {
      showToast(toErrorMessage(err), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete product?')) return;
    try {
      await dispatch(deleteProduct(id)).unwrap();
      showToast('Product deleted');
      window.dispatchEvent(new Event('productsUpdated'));
    } catch (err) {
      showToast(toErrorMessage(err), 'error');
    }
  };

  const canAddProduct = shops.length > 0;

  return (
    <div className={styles.manageProducts}>
      <h2>Manage Products</h2>
      <button onClick={openNew} disabled={!canAddProduct}>
        Add Product
      </button>
      {!canAddProduct && !shopsLoading && (
        <p className={styles.emptyState}>Create a shop before adding products.</p>
      )}
      {loading && <p>Loading...</p>}
      <div className={styles.grid}>
        {items.map((p) => (
          <div key={p._id} className={styles.cardWrapper}>
            <ProductCard product={p} showActions={false} />
            <div className={styles.actions}>
              <button onClick={() => openEdit(p)}>Edit</button>
              <button onClick={() => handleDelete(p._id)}>Delete</button>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className={styles.modal}>
          <form onSubmit={handleSubmit} className={styles.form}>
            <label>
              Shop
              <select
                value={form.shopId}
                onChange={(e) => setForm((prev) => ({ ...prev, shopId: e.target.value }))}
                disabled={shopsLoading || shops.length <= 1 || !!editId}
              >
                <option value="">Select shop</option>
                {shops.map((shop) => {
                  const value = shop._id || shop.id || '';
                  return (
                    <option key={value || shop.name} value={value}>
                      {shop.name}
                      {shop.status && shop.status !== 'approved' ? ` (${shop.status})` : ''}
                    </option>
                  );
                })}
              </select>
            </label>
            <label>
              Name
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </label>
            <label>
              Description
              <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </label>
            <label>
              Price
              <input
                type="number"
                value={Number.isFinite(form.price) ? form.price : 0}
                min="0"
                step="0.01"
                onChange={(e) =>
                  setForm({ ...form, price: Number.isFinite(+e.target.value) ? Number(e.target.value) : 0 })
                }
              />
            </label>
            <label>
              MRP
              <input
                type="number"
                value={Number.isFinite(form.mrp) ? form.mrp : 0}
                min="0"
                step="0.01"
                onChange={(e) =>
                  setForm({ ...form, mrp: Number.isFinite(+e.target.value) ? Number(e.target.value) : 0 })
                }
              />
            </label>
            <label>
              Category
              <input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
            </label>
            <label>
              Image URL
              <input value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} />
            </label>
            <label>
              Stock
              <input
                type="number"
                value={Number.isFinite(form.stock) ? form.stock : 0}
                min="0"
                onChange={(e) =>
                  setForm({ ...form, stock: Number.isFinite(+e.target.value) ? Number(e.target.value) : 0 })
                }
              />
            </label>
            <div className={styles.actions}>
              <button type="submit" disabled={submitting}>
                {submitting ? <Loader /> : 'Save'}
              </button>
              <button type="button" onClick={() => { setShowModal(false); resetForm(); }} disabled={submitting}>
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
