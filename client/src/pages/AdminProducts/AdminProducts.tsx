import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import { useForm } from 'react-hook-form';
import {
  fetchProducts,
  fetchShops,
  createProduct as apiCreateProduct,
  updateProduct as apiUpdateProduct,
  deleteProduct as apiDeleteProduct,
  type ProductQueryParams,
} from '../../api/admin';
import DataTable, { type Column } from '../../components/admin/DataTable';
import EmptyState from '../../components/ui/EmptyState';
import ErrorCard from '../../components/ui/ErrorCard';
import SkeletonList from '../../components/ui/SkeletonList';
import StatusChip from '../../components/ui/StatusChip';
import showToast from '../../components/ui/Toast';
import { toErrorMessage } from '@/lib/response';
import './AdminProducts.scss';

interface Product {
  _id: string;
  name: string;
  shopId: string;
  shopName?: string;
  category: string;
  price: number;
  mrp: number;
  discount: number;
  stock: number;
  status: string;
  image?: string;
  images?: string[];
  updatedAt: string;
}

type ProductRow = Product & { actions?: string };

const emptyForm = {
  name: '',
  mrp: 0,
  price: 0,
  stock: 0,
  images: '',
};

interface ShopSummary {
  _id: string;
  name: string;
  status?: string;
}

type CreateProductFormValues = {
  shopId: string;
  name: string;
  description: string;
  category: string;
  price: number;
  mrp: number;
  stock: number;
  imageUrl: string;
};

const readFileAsDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Unsupported image format'));
      }
    };
    reader.onerror = () => reject(reader.error ?? new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });

const focusableSelectors =
  'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';

const AdminProducts = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [shop, setShop] = useState('');
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [sort, setSort] = useState('-updatedAt');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 10;

  const [edit, setEdit] = useState<Product | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [shops, setShops] = useState<ShopSummary[]>([]);
  const [shopsLoading, setShopsLoading] = useState(false);
  const modalRef = useRef<HTMLFormElement | null>(null);
  const lastFocusedRef = useRef<HTMLElement | null>(null);

  const {
    register: registerCreate,
    handleSubmit: handleCreateSubmit,
    reset: resetCreate,
    watch: watchCreate,
    setValue: setCreateValue,
    formState: { errors: createErrors, isSubmitting: createSubmitting },
  } = useForm<CreateProductFormValues>({
    defaultValues: {
      shopId: '',
      name: '',
      description: '',
      category: '',
      price: 0,
      mrp: 0,
      stock: 0,
      imageUrl: '',
    },
  });
  const createImagePreview = watchCreate('imageUrl');
  const approvedShops = useMemo(
    () =>
      shops.filter((shop) => {
        const statusValue = shop.status?.toLowerCase();
        if (!statusValue) return true;
        return statusValue === 'approved' || statusValue === 'active';
      }),
    [shops],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: ProductQueryParams = {
        query,
        shopId: shop || undefined,
        category: category || undefined,
        status: status || undefined,
        minPrice: minPrice ? Number(minPrice) : undefined,
        maxPrice: maxPrice ? Number(maxPrice) : undefined,
        sort,
        page,
        pageSize,
      };
      const data = await fetchProducts(params);
      const items = Array.isArray(data.items) ? (data.items as Product[]) : [];
      setProducts(items);
      setTotal(typeof data.total === 'number' ? data.total : items.length);
    } catch {
      setError('Failed to load products');
    } finally {
      setLoading(false);
    }
  }, [query, shop, category, status, minPrice, maxPrice, sort, page, pageSize]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    let active = true;
    const loadShopsList = async () => {
      setShopsLoading(true);
      try {
        const data = await fetchShops({ status: 'approved', pageSize: 100 });
        const items = Array.isArray(data.items) ? data.items : [];
        if (!active) return;
        setShops(
          items.map((item: any) => ({
            _id: String(item?._id ?? item?.id ?? ''),
            name: item?.name ?? 'Unnamed shop',
            status: item?.status ?? item?.approvalStatus ?? item?.state ?? '',
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

    void loadShopsList();
    return () => {
      active = false;
    };
  }, []);

  const openCreateModal = () => {
    const fallback = approvedShops[0] ?? shops[0];
    resetCreate({
      shopId: fallback?._id ?? '',
      name: '',
      description: '',
      category: '',
      price: 0,
      mrp: 0,
      stock: 0,
      imageUrl: '',
    });
    setCreateError(null);
    setCreateOpen(true);
  };

  const closeCreateModal = () => {
    setCreateOpen(false);
    setCreateError(null);
  };

  const handleCreateImageUpload = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;
      try {
        const dataUrl = await readFileAsDataUrl(file);
        setCreateValue('imageUrl', dataUrl, { shouldDirty: true, shouldTouch: true });
      } catch (err) {
        showToast(toErrorMessage(err), 'error');
      }
    },
    [setCreateValue],
  );

  useEffect(() => {
    if (!edit) return undefined;
    const node = modalRef.current;
    if (!node) return undefined;

    lastFocusedRef.current = document.activeElement as HTMLElement | null;
    const focusable = node.querySelectorAll<HTMLElement>(focusableSelectors);
    const first = focusable[0];
    (first ?? node).focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setEdit(null);
        return;
      }
      if (event.key !== 'Tab' || focusable.length === 0) return;
      const nodes = Array.from(node.querySelectorAll<HTMLElement>(focusableSelectors));
      if (nodes.length === 0) return;
      const firstNode = nodes[0];
      const lastNode = nodes[nodes.length - 1];
      if (event.shiftKey) {
        if (document.activeElement === firstNode) {
          event.preventDefault();
          lastNode.focus();
        }
      } else if (document.activeElement === lastNode) {
        event.preventDefault();
        firstNode.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      lastFocusedRef.current?.focus();
    };
  }, [edit]);

  const openEdit = (p: Product) => {
    setEdit(p);
    setForm({
      name: p.name,
      mrp: p.mrp,
      price: p.price,
      stock: p.stock,
      images: p.images?.join(',') || '',
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!edit) return;
    const prev = { ...edit };
    const imagesArr = form.images
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const updated: Product = {
      ...edit,
      name: form.name,
      mrp: form.mrp,
      price: form.price,
      stock: form.stock,
      images: imagesArr,
      image: imagesArr[0],
      discount: form.mrp ? Math.round(((form.mrp - form.price) / form.mrp) * 100) : 0,
    };
    setSaving(true);
    setProducts((prevList) =>
      prevList.map((p) => (p._id === edit._id ? updated : p)),
    );
    try {
      await apiUpdateProduct(edit._id, {
        name: updated.name,
        mrp: updated.mrp,
        price: updated.price,
        stock: updated.stock,
        images: imagesArr,
      });
      setEdit(null);
    } catch {
      setProducts((prevList) =>
        prevList.map((p) => (p._id === prev._id ? prev : p)),
      );
      showToast('Failed to update product', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete product?')) return;
    const prev = [...products];
    setProducts((list) => list.filter((p) => p._id !== id));
    try {
      await apiDeleteProduct(id);
    } catch {
      setProducts(prev);
      showToast('Failed to delete product', 'error');
    }
  };

  const handleCreateProduct = handleCreateSubmit(async (values) => {
    if (!values.shopId) {
      setCreateError('Select a shop to continue');
      return;
    }

    const trimmedName = values.name.trim();
    const trimmedDescription = values.description.trim();
    const trimmedCategory = values.category.trim();
    const priceValue = Number(values.price);
    const mrpValue = Number(values.mrp);
    const stockValue = Number(values.stock);

    if (trimmedName.length < 3) {
      setCreateError('Name must be at least 3 characters long');
      return;
    }
    if (trimmedDescription.length < 10) {
      setCreateError('Description must be at least 10 characters long');
      return;
    }
    if (trimmedCategory.length < 2) {
      setCreateError('Category must be at least 2 characters long');
      return;
    }
    if (!Number.isFinite(priceValue) || priceValue <= 0) {
      setCreateError('Enter a valid price greater than zero');
      return;
    }
    if (!Number.isFinite(mrpValue) || mrpValue <= 0) {
      setCreateError('Enter a valid MRP greater than zero');
      return;
    }
    if (priceValue > mrpValue) {
      setCreateError('Price cannot exceed MRP');
      return;
    }
    if (!Number.isFinite(stockValue) || stockValue < 0) {
      setCreateError('Stock must be zero or a positive number');
      return;
    }

    const imageSource = values.imageUrl.trim();

    try {
      setCreateError(null);
      await apiCreateProduct({
        shopId: values.shopId,
        name: trimmedName,
        description: trimmedDescription,
        category: trimmedCategory,
        price: priceValue,
        mrp: mrpValue,
        stock: stockValue,
        image: imageSource || undefined,
        images: imageSource ? [imageSource] : undefined,
      });
      showToast('Product created', 'success');
      const fallbackShop = values.shopId || approvedShops[0]?._id || shops[0]?._id || '';
      resetCreate({
        shopId: fallbackShop,
        name: '',
        description: '',
        category: '',
        price: 0,
        mrp: 0,
        stock: 0,
        imageUrl: '',
      });
      closeCreateModal();
      await load();
    } catch (err) {
      setCreateError(toErrorMessage(err) || 'Failed to create product');
    }
  });

  const columns: Column<ProductRow>[] = [
    {
      key: 'image',
      label: 'Image',
      render: (p) =>
        p.image ? (
          <img
            src={p.image}
            alt={p.name}
            width={40}
            height={40}
            loading="lazy"
            style={{ objectFit: 'cover' }}
          />
        ) : null,
    },
    { key: 'name', label: 'Name' },
    {
      key: 'shopName',
      label: 'Shop',
      render: (p) => p.shopName || p.shopId,
    },
    { key: 'category', label: 'Category' },
    { key: 'price', label: 'Price' },
    { key: 'stock', label: 'Stock' },
    {
      key: 'status',
      label: 'Status',
      render: (p) => <StatusChip status={p.status as any} />,
    },
    {
      key: 'updatedAt',
      label: 'Updated',
      render: (p) => new Date(p.updatedAt).toLocaleDateString(),
    },
    {
      key: 'actions',
      label: '',
      render: (p) => (
        <div className="actions">
          <button onClick={() => openEdit(p)}>Edit</button>
          <button onClick={() => handleDelete(p._id)}>Delete</button>
        </div>
      ),
    },
  ];

  return (
    <div className="admin-products">
      <div className="admin-products__header">
        <div>
          <h2>Products</h2>
          <p className="admin-products__subtitle">
            Monitor listings across shops and keep pricing accurate.
          </p>
        </div>
        <button
          type="button"
          className="admin-products__createBtn"
          onClick={openCreateModal}
          disabled={
            shopsLoading || (approvedShops.length === 0 && shops.length === 0)
          }
        >
          Add product
        </button>
      </div>
      <div className="filters">
        <input
          placeholder="Search name"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setPage(1);
          }}
        />
        <input
          placeholder="Shop ID"
          value={shop}
          onChange={(e) => {
            setShop(e.target.value);
            setPage(1);
          }}
        />
        <input
          placeholder="Category"
          value={category}
          onChange={(e) => {
            setCategory(e.target.value);
            setPage(1);
          }}
        />
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        <input
          type="number"
          placeholder="Min Price"
          value={minPrice}
          onChange={(e) => {
            setMinPrice(e.target.value);
            setPage(1);
          }}
        />
        <input
          type="number"
          placeholder="Max Price"
          value={maxPrice}
          onChange={(e) => {
            setMaxPrice(e.target.value);
            setPage(1);
          }}
        />
        <select value={sort} onChange={(e) => setSort(e.target.value)}>
          <option value="-updatedAt">Newest</option>
          <option value="updatedAt">Oldest</option>
          <option value="-price">Price: High to Low</option>
          <option value="price">Price: Low to High</option>
        </select>
      </div>
      {(() => {
        const hasProducts = (products ?? []).length > 0;
        if (loading && !hasProducts) {
          return <SkeletonList count={pageSize} />;
        }
        if (error) {
          return (
            <ErrorCard
              message={error}
              onRetry={() => {
                void load();
              }}
            />
          );
        }
        if (!loading && !hasProducts) {
          return (
            <EmptyState
              title="No products found"
              message="Adjust your filters or refresh to load the latest products."
              ctaLabel="Refresh"
              onCtaClick={() => {
                void load();
              }}
            />
          );
        }
        return (
          <DataTable<ProductRow>
            columns={columns}
            rows={(products ?? []) as ProductRow[]}
            page={page}
            pageSize={pageSize}
            total={total}
            onPageChange={setPage}
            loading={loading}
          />
        );
      })()}
      {createOpen && (
        <div
          className="modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="admin-create-product-heading"
          onClick={closeCreateModal}
        >
          <form
            className="modal-content"
            onSubmit={handleCreateProduct}
            onClick={(event) => event.stopPropagation()}
          >
            <h3 id="admin-create-product-heading">Add product</h3>
            <p className="hint">Create a catalog item tied to an approved shop.</p>
            {createError ? (
              <p className="modal-error" role="alert">
                {createError}
              </p>
            ) : null}
            <label>
              Shop
              <select
                {...registerCreate('shopId', { required: 'Select a shop' })}
                disabled={shopsLoading || shops.length === 0}
              >
                <option value="">Select shop</option>
                {shops.map((shopItem) => {
                  const disabled =
                    shopItem.status &&
                    !['approved', 'active'].includes(shopItem.status.toLowerCase());
                  return (
                    <option key={shopItem._id} value={shopItem._id} disabled={disabled}>
                      {shopItem.name}
                      {shopItem.status && shopItem.status.toLowerCase() !== 'approved'
                        ? ` (${shopItem.status})`
                        : ''}
                    </option>
                  );
                })}
              </select>
              {createErrors.shopId ? (
                <span className="field-error">{createErrors.shopId.message}</span>
              ) : null}
            </label>
            <label>
              Product name
              <input
                {...registerCreate('name', {
                  required: 'Enter a product name',
                  minLength: { value: 3, message: 'Name must be at least 3 characters' },
                })}
                placeholder="Signature dish"
              />
              {createErrors.name ? (
                <span className="field-error">{createErrors.name.message}</span>
              ) : null}
            </label>
            <label>
              Description
              <textarea
                rows={3}
                {...registerCreate('description', {
                  required: 'Describe the product',
                  minLength: { value: 10, message: 'Description must be at least 10 characters' },
                })}
                placeholder="Write a short summary"
              />
              {createErrors.description ? (
                <span className="field-error">{createErrors.description.message}</span>
              ) : null}
            </label>
            <label>
              Category
              <input
                {...registerCreate('category', {
                  required: 'Enter a category',
                  minLength: { value: 2, message: 'Category must be at least 2 characters' },
                })}
                placeholder="Beverages, electronics, ..."
              />
              {createErrors.category ? (
                <span className="field-error">{createErrors.category.message}</span>
              ) : null}
            </label>
            <div className="modal-grid">
              <label>
                Price (₹)
                <input
                  type="number"
                  step="0.01"
                  min={0}
                  {...registerCreate('price', {
                    valueAsNumber: true,
                    min: { value: 1, message: 'Enter a price greater than zero' },
                  })}
                />
                {createErrors.price ? (
                  <span className="field-error">{createErrors.price.message}</span>
                ) : null}
              </label>
              <label>
                MRP (₹)
                <input
                  type="number"
                  step="0.01"
                  min={0}
                  {...registerCreate('mrp', {
                    valueAsNumber: true,
                    min: { value: 1, message: 'Enter an MRP greater than zero' },
                  })}
                />
                {createErrors.mrp ? (
                  <span className="field-error">{createErrors.mrp.message}</span>
                ) : null}
              </label>
              <label>
                Stock
                <input
                  type="number"
                  min={0}
                  step={1}
                  {...registerCreate('stock', {
                    valueAsNumber: true,
                    min: { value: 0, message: 'Stock cannot be negative' },
                  })}
                />
                {createErrors.stock ? (
                  <span className="field-error">{createErrors.stock.message}</span>
                ) : null}
              </label>
            </div>
            <label>
              Image URL
              <input
                {...registerCreate('imageUrl', {
                  validate: (value) => {
                    if (!value) return true;
                    if (value.startsWith('data:')) return true;
                    return (
                      /^(https?:\/\/).*/iu.test(value) ||
                      'Enter a full URL or upload an image'
                    );
                  },
                })}
                placeholder="https://example.com/image.jpg"
              />
              {createErrors.imageUrl ? (
                <span className="field-error">{createErrors.imageUrl.message}</span>
              ) : null}
            </label>
            <label className="file-upload">
              Upload image
              <input type="file" accept="image/*" onChange={handleCreateImageUpload} />
              <span className="hint">JPEG or PNG up to 2 MB. Uploaded images override the URL.</span>
            </label>
            {createImagePreview ? (
              <img
                src={createImagePreview}
                alt="Preview"
                className="admin-products__imagePreview"
              />
            ) : null}
            <div className="modal-actions">
              <button type="submit" disabled={createSubmitting}>
                {createSubmitting ? 'Creating…' : 'Create product'}
              </button>
              <button type="button" onClick={closeCreateModal} disabled={createSubmitting}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
      {edit && (
        <div
          className="modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="admin-edit-product-heading"
          onClick={() => setEdit(null)}
        >
          <form
            ref={modalRef}
            className="modal-content"
            onSubmit={handleSave}
            tabIndex={-1}
            onClick={(event) => event.stopPropagation()}
          >
            <h3 id="admin-edit-product-heading">Edit Product</h3>
            <label>
              Name
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </label>
            <label>
              MRP
              <input
                type="number"
                value={form.mrp}
                onChange={(e) =>
                  setForm({ ...form, mrp: Number(e.target.value) })
                }
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
              />
            </label>
            <div>Discount: {form.mrp ? Math.round(((form.mrp - form.price) / form.mrp) * 100) : 0}%</div>
            <label>
              Stock
              <input
                type="number"
                value={form.stock}
                onChange={(e) =>
                  setForm({ ...form, stock: Number(e.target.value) })
                }
              />
            </label>
            <label>
              Images (comma separated URLs)
              <input
                value={form.images}
                onChange={(e) => setForm({ ...form, images: e.target.value })}
              />
            </label>
            <div className="modal-actions">
              <button type="submit" disabled={saving}>
                {saving ? 'Saving...' : 'Save'}
              </button>
              <button type="button" onClick={() => setEdit(null)} disabled={saving}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default AdminProducts;
