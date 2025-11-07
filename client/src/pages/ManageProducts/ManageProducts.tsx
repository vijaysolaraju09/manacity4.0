import { useEffect, useMemo, useState, type ChangeEvent } from 'react';
import { Bell } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
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
import EmptyState from '@/components/ui/EmptyState';
import { paths } from '@/routes/paths';
import { fetchNotifs } from '@/store/notifs';

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

type ProductFormErrors = Partial<Record<keyof ProductFormState, string>>;

const validateProductForm = (form: ProductFormState): ProductFormErrors => {
  const errors: ProductFormErrors = {};
  if (!form.shopId.trim()) {
    errors.shopId = 'Select a shop to continue';
  }
  if (form.name.trim().length < 3) {
    errors.name = 'Name must be at least 3 characters';
  }
  if (form.description.trim().length < 10) {
    errors.description = 'Description must be at least 10 characters';
  }
  if (!Number.isFinite(form.price) || form.price <= 0) {
    errors.price = 'Enter a valid price greater than 0';
  }
  if (!Number.isFinite(form.mrp) || form.mrp <= 0) {
    errors.mrp = 'Enter a valid MRP greater than 0';
  }
  if (
    Number.isFinite(form.price) &&
    Number.isFinite(form.mrp) &&
    form.price > form.mrp
  ) {
    errors.price = 'Price cannot exceed MRP';
    errors.mrp = 'MRP must be at least the price';
  }
  if (form.category.trim().length < 2) {
    errors.category = 'Category must be at least 2 characters';
  }
  if (form.imageUrl && !/^https?:\/\//i.test(form.imageUrl.trim())) {
    errors.imageUrl = 'Image URL must start with http or https';
  }
  if (!Number.isFinite(form.stock) || form.stock < 0) {
    errors.stock = 'Stock must be zero or a positive number';
  }
  return errors;
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
  const userRole = useSelector((s: RootState) => s.auth.user?.role);
  const unreadNotifications = useSelector((s: RootState) => s.notifs.unread);
  const notificationsStatus = useSelector((s: RootState) => s.notifs.status);
  const isPrivileged = userRole === 'business' || userRole === 'admin';
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<ProductFormState>(emptyForm);
  const [editId, setEditId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [touched, setTouched] = useState<Partial<Record<keyof ProductFormState, boolean>>>({});
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [shops, setShops] = useState<ShopSummary[]>([]);
  const [shopsLoading, setShopsLoading] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [selectedShopId, setSelectedShopId] = useState('');
  const navigate = useNavigate();

  if (!isPrivileged) {
    return (
      <div className={styles.guard}>
        <EmptyState
          title="Business access required"
          message="Only approved business accounts can manage catalog products. Visit your profile to request or review business verification."
          ctaLabel="Go to profile"
          onCtaClick={() => navigate(paths.profile())}
        />
      </div>
    );
  }

  const defaultShopId = useMemo(() => {
    if (!shops.length) return '';
    const approved = shops.find((s) => s.status === 'approved');
    const target = approved ?? shops[0];
    return target?._id || target?.id || '';
  }, [shops]);

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
    if (!isPrivileged) return;
    if (notificationsStatus === 'idle') {
      void dispatch(fetchNotifs({ page: 1 }));
    }
  }, [dispatch, notificationsStatus, isPrivileged]);

  useEffect(() => {
    if (!defaultShopId) return;
    setSelectedShopId((prev) => (prev ? prev : defaultShopId));
  }, [defaultShopId]);

  useEffect(() => {
    if (!shops.length) {
      setSelectedShopId('');
      return;
    }
    if (
      selectedShopId &&
      shops.some((shop) => {
        const id = shop._id || shop.id;
        return id === selectedShopId;
      })
    ) {
      return;
    }
    if (defaultShopId) {
      setSelectedShopId(defaultShopId);
    }
  }, [shops, selectedShopId, defaultShopId]);

  useEffect(() => {
    if (!selectedShopId) return;
    dispatch(fetchMyProducts({ shopId: selectedShopId }));
  }, [dispatch, selectedShopId]);

  useEffect(() => {
    if (!selectedShopId) return;
    setForm((prev) => {
      if (editId) return prev;
      if (prev.shopId) return prev;
      return { ...prev, shopId: selectedShopId };
    });
  }, [selectedShopId, editId]);

  const resetForm = () => {
    const baseShopId = selectedShopId || defaultShopId;
    setForm({ ...emptyForm, shopId: baseShopId });
    setEditId(null);
    setFormError(null);
    setTouched({});
    setSubmitAttempted(false);
  };

  const openNew = () => {
    const baseShopId = selectedShopId || defaultShopId;
    setForm({ ...emptyForm, shopId: baseShopId });
    setEditId(null);
    setFormError(null);
    setTouched({});
    setSubmitAttempted(false);
    setShowModal(true);
  };

  const openEdit = (p: Product) => {
    const targetShopId = p.shopId || (typeof p.shop === 'string' ? p.shop : '') || defaultShopId;
    if (targetShopId) {
      setSelectedShopId((prev) => (prev === targetShopId ? prev : targetShopId));
    }
    setEditId(p._id);
    setForm({
      shopId: targetShopId,
      name: p.name || '',
      description: p.description || '',
      price: typeof p.price === 'number' ? p.price : 0,
      mrp: typeof p.mrp === 'number' ? p.mrp : 0,
      category: p.category || '',
      imageUrl: p.image || '',
      stock: typeof p.stock === 'number' ? p.stock : 0,
    });
    setFormError(null);
    setTouched({});
    setSubmitAttempted(false);
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSubmitAttempted(true);
    const validation = validateProductForm(form);
    if (Object.keys(validation).length > 0) {
      return;
    }
    const pricePaise = Math.round(form.price * 100);
    const mrpPaise = Math.round(form.mrp * 100);
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

      const activeShopId = form.shopId || selectedShopId || defaultShopId;
      if (editId) {
        const updatePayload: UpdateProductPayload = {
          ...payloadBase,
          shopId: form.shopId,
        };
        await dispatch(updateProduct({ id: editId, data: updatePayload })).unwrap();
        if (activeShopId) {
          await dispatch(fetchMyProducts({ shopId: activeShopId })).unwrap();
        }
        showToast('Product updated', 'success');
      } else {
        const createPayload: CreateProductPayload = {
          ...payloadBase,
          shopId: form.shopId,
        };
        await dispatch(createProduct(createPayload)).unwrap();
        if (activeShopId) {
          await dispatch(fetchMyProducts({ shopId: activeShopId })).unwrap();
        }
        showToast('Product added', 'success');
      }
      setShowModal(false);
      resetForm();
      window.dispatchEvent(new Event('productsUpdated'));
    } catch (err) {
      setFormError(toErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const validation = validateProductForm(form);
  const isFormValid = Object.keys(validation).length === 0;
  const shouldShowError = (field: keyof ProductFormState) =>
    Boolean((touched[field] || submitAttempted) && validation[field]);

  const updateField = <K extends keyof ProductFormState>(field: K, value: ProductFormState[K]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const markTouched = (field: keyof ProductFormState) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
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

  const unreadBadge = unreadNotifications > 0
    ? unreadNotifications > 99
      ? '99+'
      : String(unreadNotifications)
    : null;

  const handleNotificationsClick = () => {
    navigate(paths.business.receivedOrders());
  };

  const handleActiveShopChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value;
    setSelectedShopId(value);
    if (!editId) {
      setForm((prev) => ({ ...prev, shopId: value }));
    }
  };

  const canAddProduct = shops.length > 0 && Boolean(selectedShopId);
  const shopSelectValue = selectedShopId || '';

  return (
    <div className={styles.manageProducts}>
      <div className={styles.header}>
        <div>
          <h2>Manage Products</h2>
          <p className={styles.subtitle}>
            Keep your menu current and control when your shop is open for orders.
          </p>
        </div>
        <div className={styles.headerControls}>
          <button
            type="button"
            className={styles.notificationButton}
            onClick={handleNotificationsClick}
            aria-label="View received orders"
          >
            <Bell aria-hidden="true" size={18} />
            <span>Received orders</span>
            {unreadBadge ? <span className={styles.badge}>{unreadBadge}</span> : null}
          </button>
          <label className={styles.shopPicker}>
            <span>Viewing shop</span>
            <select
              value={shopSelectValue}
              onChange={handleActiveShopChange}
              disabled={shopsLoading || shops.length === 0}
            >
              <option value="" disabled>
                Select a shop
              </option>
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
          <button onClick={openNew} disabled={!canAddProduct}>
            Add Product
          </button>
        </div>
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
            {formError && (
              <p className={styles.formError} role="alert">
                {formError}
              </p>
            )}
            <label>
              Shop
              <select
                value={form.shopId}
                onChange={(e) => updateField('shopId', e.target.value)}
                onBlur={() => markTouched('shopId')}
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
              {shouldShowError('shopId') ? (
                <span className={styles.fieldError}>{validation.shopId}</span>
              ) : null}
            </label>
            <label>
              Name
              <input
                value={form.name}
                onChange={(e) => updateField('name', e.target.value)}
                onBlur={() => markTouched('name')}
              />
              {shouldShowError('name') ? (
                <span className={styles.fieldError}>{validation.name}</span>
              ) : null}
            </label>
            <label>
              Description
              <textarea
                value={form.description}
                onChange={(e) => updateField('description', e.target.value)}
                onBlur={() => markTouched('description')}
              />
              {shouldShowError('description') ? (
                <span className={styles.fieldError}>{validation.description}</span>
              ) : null}
            </label>
            <label>
              Price
              <input
                type="number"
                value={Number.isFinite(form.price) ? form.price : 0}
                min="0"
                step="0.01"
                onChange={(e) =>
                  updateField('price', Number.isFinite(+e.target.value) ? Number(e.target.value) : 0)
                }
                onBlur={() => markTouched('price')}
              />
              {shouldShowError('price') ? (
                <span className={styles.fieldError}>{validation.price}</span>
              ) : null}
            </label>
            <label>
              MRP
              <input
                type="number"
                value={Number.isFinite(form.mrp) ? form.mrp : 0}
                min="0"
                step="0.01"
                onChange={(e) =>
                  updateField('mrp', Number.isFinite(+e.target.value) ? Number(e.target.value) : 0)
                }
                onBlur={() => markTouched('mrp')}
              />
              {shouldShowError('mrp') ? (
                <span className={styles.fieldError}>{validation.mrp}</span>
              ) : null}
            </label>
            <label>
              Category
              <input
                value={form.category}
                onChange={(e) => updateField('category', e.target.value)}
                onBlur={() => markTouched('category')}
              />
              {shouldShowError('category') ? (
                <span className={styles.fieldError}>{validation.category}</span>
              ) : null}
            </label>
            <label>
              Image URL
              <input
                value={form.imageUrl}
                onChange={(e) => updateField('imageUrl', e.target.value)}
                onBlur={() => markTouched('imageUrl')}
              />
              {shouldShowError('imageUrl') ? (
                <span className={styles.fieldError}>{validation.imageUrl}</span>
              ) : null}
            </label>
            <label>
              Stock
              <input
                type="number"
                value={Number.isFinite(form.stock) ? form.stock : 0}
                min="0"
                onChange={(e) =>
                  updateField('stock', Number.isFinite(+e.target.value) ? Number(e.target.value) : 0)
                }
                onBlur={() => markTouched('stock')}
              />
              {shouldShowError('stock') ? (
                <span className={styles.fieldError}>{validation.stock}</span>
              ) : null}
            </label>
            <div className={styles.actions}>
              <button type="submit" disabled={submitting || !isFormValid}>
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
