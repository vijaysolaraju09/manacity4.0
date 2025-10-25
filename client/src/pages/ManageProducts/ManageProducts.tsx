import { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { http } from '@/lib/http';
import { toItems, toItem, toErrorMessage } from '@/lib/response';
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
import ProductCard, {
  type Product as ProductCardProduct,
} from '../../components/ui/ProductCard.tsx';
import showToast from '../../components/ui/Toast';
import styles from './ManageProducts.module.scss';
import { rupeesToPaise } from '@/utils/currency';

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
  location?: string;
  isOpen?: boolean;
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

const ensurePaise = (value: unknown): number | undefined => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return undefined;
  return Math.max(0, Math.round(value));
};

const ensurePercent = (value: unknown): number | undefined => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return undefined;
  return Math.max(0, Math.round(value));
};

const toCardProduct = (product: Product): ProductCardProduct => {
  const pricePaise =
    ensurePaise(product.pricePaise) ??
    ensurePaise(typeof product.price === 'number' ? rupeesToPaise(product.price) : undefined) ??
    0;

  const mrpPaise =
    ensurePaise(product.mrpPaise) ??
    ensurePaise(typeof (product as any).mrp === 'number' ? rupeesToPaise((product as any).mrp) : undefined);

  const discountPercent =
    ensurePercent((product as any).discountPercent) ??
    ensurePercent(product.discount) ??
    (mrpPaise && mrpPaise > 0
      ? Math.max(
          0,
          Math.round(
            ((Math.max(0, mrpPaise) - Math.max(0, pricePaise)) / Math.max(1, mrpPaise)) *
              100,
          ),
        )
      : undefined);

  return {
    ...product,
    pricePaise,
    mrpPaise: mrpPaise ?? undefined,
    discountPercent: discountPercent ?? undefined,
  } as ProductCardProduct;
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
  const [togglingId, setTogglingId] = useState<string | null>(null);

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
        setShops(
          data.map((shop) => ({
            ...shop,
            isOpen: typeof shop.isOpen === 'boolean' ? shop.isOpen : true,
          })),
        );
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

  const handleToggleShop = async (shop: ShopSummary) => {
    const id = shop._id || shop.id;
    if (!id) return;
    try {
      const nextIsOpen = !shop.isOpen;
      setTogglingId(id);
      const res = await http.patch(`/shops/${id}`, { isOpen: nextIsOpen });
      const updated = toItem(res) as ShopSummary;
      setShops((prev) =>
        prev.map((s) => {
          const matchId = s._id || s.id;
          if (matchId !== id) return s;
          const normalized: ShopSummary = {
            ...s,
            ...updated,
            isOpen:
              typeof updated?.isOpen === 'boolean'
                ? updated.isOpen
                : nextIsOpen,
          };
          return normalized;
        }),
      );
      showToast(nextIsOpen ? 'Shop marked open' : 'Shop marked closed', 'success');
    } catch (err) {
      showToast(toErrorMessage(err), 'error');
    } finally {
      setTogglingId(null);
    }
  };

  const canAddProduct = shops.length > 0;

  return (
    <div className={styles.manageProducts}>
      <div className={styles.header}>
        <div>
          <h2>Manage Products</h2>
          <p className={styles.subtitle}>
            Keep your menu current and control when your shop is open for orders.
          </p>
        </div>
        <button onClick={openNew} disabled={!canAddProduct}>
          Add Product
        </button>
      </div>

      <section
        className={styles.shopAvailability}
        aria-labelledby="shop-availability-heading"
      >
        <div className={styles.sectionHeader}>
          <h3 id="shop-availability-heading">Shop availability</h3>
          {togglingId && <span className={styles.sectionStatus}>Updating…</span>}
        </div>
        {shopsLoading ? (
          <p className={styles.mutedText}>Loading your shops…</p>
        ) : shops.length ? (
          <ul className={styles.shopList}>
            {shops.map((shop) => {
              const id = shop._id || shop.id || shop.name;
              const isApproved = shop.status === 'approved';
              const disabled = togglingId === (shop._id || shop.id) || !isApproved;
              return (
                <li key={id} className={styles.shopItem}>
                  <div className={styles.shopInfo}>
                    <p className={styles.shopName}>{shop.name}</p>
                    <p className={styles.shopMeta}>
                      {shop.location ? `${shop.location} · ` : ''}
                      {isApproved ? 'Approved' : (shop.status || 'Pending').replace(/^(.)/, (c) => c.toUpperCase())}
                    </p>
                  </div>
                  <label
                    className={styles.shopToggle}
                    data-disabled={disabled ? 'true' : 'false'}
                  >
                    <input
                      type="checkbox"
                      role="switch"
                      className={styles.toggleInput}
                      checked={Boolean(shop.isOpen)}
                      onChange={() => handleToggleShop(shop)}
                      disabled={disabled}
                      aria-label={`Mark ${shop.name} as ${shop.isOpen ? 'closed' : 'open'}`}
                    />
                    <span className={styles.toggleTrack} aria-hidden="true">
                      <span className={styles.toggleThumb} />
                    </span>
                    <span className={styles.toggleStatus}>
                      {shop.isOpen ? 'Open' : 'Closed'}
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className={styles.mutedText}>Create a shop before adding products.</p>
        )}
        {!shopsLoading && shops.some((shop) => shop.status !== 'approved') && (
          <p className={styles.hint}>Shops must be approved before they can be opened.</p>
        )}
      </section>

      {loading && <p>Loading...</p>}
      <div className={styles.grid}>
        {items.map((p) => {
          const cardProduct = toCardProduct(p);
          return (
            <div key={p._id} className={styles.cardWrapper}>
              <ProductCard product={cardProduct} showActions={false} />
              <div className={styles.actions}>
                <button onClick={() => openEdit(p)}>Edit</button>
                <button onClick={() => handleDelete(p._id)}>Delete</button>
              </div>
            </div>
          );
        })}
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
