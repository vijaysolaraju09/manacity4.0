import React, { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
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
  description?: string;
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

const emptyForm: CreateProductFormValues & { images: string } = {
  shopId: '',
  name: '',
  description: '',
  category: '',
  price: 0,
  mrp: 0,
  discount: 0,
  stock: 0,
  imageUrl: '',
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
  discount: number;
  stock: number;
  imageUrl: string;
};

type CreateFieldErrors = Partial<Record<keyof CreateProductFormValues, string>>;

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
  const [creating, setCreating] = useState(false);
  const [createFormValues, setCreateFormValues] = useState<CreateProductFormValues>({
    shopId: '',
    name: '',
    description: '',
    category: '',
    price: 0,
    mrp: 0,
    discount: 0,
    stock: 0,
    imageUrl: '',
  });
  const [createFieldErrors, setCreateFieldErrors] = useState<CreateFieldErrors>({});
  const [shops, setShops] = useState<ShopSummary[]>([]);
  const [shopsLoading, setShopsLoading] = useState(false);
  const modalRef = useRef<HTMLFormElement | null>(null);
  const lastFocusedRef = useRef<HTMLElement | null>(null);
  const lastPriceChangeSource = useRef<'price' | 'discount' | null>(null);
  const createImagePreview = createFormValues.imageUrl;
  const createPriceValue = createFormValues.price;
  const createMrpValue = createFormValues.mrp;
  const createDiscountValue = createFormValues.discount;

  useEffect(() => {
    if (
      typeof createPriceValue !== 'number' ||
      typeof createMrpValue !== 'number' ||
      createMrpValue <= 0
    ) {
      return;
    }
    if (lastPriceChangeSource.current === 'discount') {
      lastPriceChangeSource.current = null;
      return;
    }
    const computed = Math.max(
      0,
      Math.min(100, Math.round(((createMrpValue - createPriceValue) / createMrpValue) * 100)),
    );
    if (!Number.isNaN(computed) && computed !== createDiscountValue) {
      setCreateFormValues((prev) =>
        prev.discount === computed ? prev : { ...prev, discount: computed },
      );
    }
    if (lastPriceChangeSource.current === 'price') {
      lastPriceChangeSource.current = null;
    }
  }, [createDiscountValue, createForm, createMrpValue, createPriceValue]);

  useEffect(() => {
    if (lastPriceChangeSource.current !== 'discount') {
      return;
    }
    if (
      typeof createDiscountValue !== 'number' ||
      typeof createMrpValue !== 'number' ||
      createMrpValue <= 0
    ) {
      lastPriceChangeSource.current = null;
      return;
    }
    const nextPrice = Number((createMrpValue * (100 - createDiscountValue)) / 100);
    if (!Number.isNaN(nextPrice)) {
      setCreateFormValues((prev) => ({ ...prev, price: Number(nextPrice.toFixed(2)) }));
    }
    lastPriceChangeSource.current = null;
  }, [createDiscountValue, createMrpValue]);

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
    setCreateFormValues({
      shopId: fallback?._id ?? '',
      name: '',
      description: '',
      category: '',
      price: 0,
      mrp: 0,
      discount: 0,
      stock: 0,
      imageUrl: '',
    });
    setCreateFieldErrors({});
    setCreateError(null);
    setCreateOpen(true);
  };

  const closeCreateModal = () => {
    setCreateOpen(false);
    setCreateError(null);
    setCreateFieldErrors({});
  };

  const handleCreateImageUpload = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;
      try {
        const dataUrl = await readFileAsDataUrl(file);
        setCreateFormValues((prev) => ({ ...prev, imageUrl: dataUrl }));
      } catch (err) {
        showToast(toErrorMessage(err), 'error');
      }
    },
    [],
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
      shopId: p.shopId,
      name: p.name,
      description: p.description ?? '',
      category: p.category,
      mrp: p.mrp,
      price: p.price,
      stock: p.stock,
      imageUrl: p.image ?? '',
      images: p.images?.join(',') || '',
      discount: p.discount ?? 0,
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
      description: form.description,
      mrp: form.mrp,
      price: form.price,
      stock: form.stock,
      category: form.category,
      images: imagesArr,
      image: form.imageUrl || imagesArr[0],
      discount: form.mrp ? Math.round(((form.mrp - form.price) / form.mrp) * 100) : 0,
    };
    setSaving(true);
    setProducts((prevList) =>
      prevList.map((p) => (p._id === edit._id ? updated : p)),
    );
    try {
      await apiUpdateProduct(edit._id, {
        name: updated.name,
        description: updated.description,
        mrp: updated.mrp,
        price: updated.price,
        stock: updated.stock,
        category: updated.category,
        images: imagesArr,
        image: updated.image,
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

  const handleCreateProduct = async () => {
    const errors: CreateFieldErrors = {};
    const trimmedName = createFormValues.name.trim();
    const trimmedDescription = createFormValues.description.trim();
    const trimmedCategory = createFormValues.category.trim();
    const priceValue = Number(createFormValues.price);
    const mrpValue = Number(createFormValues.mrp);
    const discountValue = Number(createFormValues.discount);
    const stockValue = Number(createFormValues.stock);

    if (!createFormValues.shopId) {
      errors.shopId = 'Select a shop to continue';
    }
    if (!trimmedName || trimmedName.length < 3) {
      errors.name = 'Name must be at least 3 characters';
    }
    if (!trimmedDescription || trimmedDescription.length < 10) {
      errors.description = 'Description must be at least 10 characters';
    }
    if (!trimmedCategory || trimmedCategory.length < 2) {
      errors.category = 'Category must be at least 2 characters';
    }
    if (!Number.isFinite(priceValue) || priceValue < 0.01) {
      errors.price = 'Enter a valid price';
    }
    if (!Number.isFinite(mrpValue) || mrpValue < 0.01) {
      errors.mrp = 'Enter a valid MRP';
    }
    if (!Number.isFinite(discountValue) || discountValue < 0 || discountValue > 100) {
      errors.discount = 'Discount must be between 0 and 100';
    }
    if (!Number.isFinite(stockValue) || stockValue < 0) {
      errors.stock = 'Stock cannot be negative';
    }
    if (createFormValues.imageUrl) {
      const isDataUrl = createFormValues.imageUrl.startsWith('data:');
      const isHttpUrl = /^(https?:\/\/).*/iu.test(createFormValues.imageUrl);
      if (!isDataUrl && !isHttpUrl) {
        errors.imageUrl = 'Enter a full URL or upload an image';
      }
    }

    if (Object.keys(errors).length > 0) {
      setCreateFieldErrors(errors);
      setCreateError('Please correct the highlighted fields');
      return;
    }

    if (priceValue > mrpValue) {
      setCreateError('Price cannot exceed MRP');
      return;
    }

    setCreateFieldErrors({});

    const imageSource = createFormValues.imageUrl.trim();

    try {
      setCreating(true);
      setCreateError(null);
      await apiCreateProduct({
        shopId: createFormValues.shopId,
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
      const fallbackShop =
        createFormValues.shopId || approvedShops[0]?._id || shops[0]?._id || '';
      setCreateFormValues({
        shopId: fallbackShop,
        name: '',
        description: '',
        category: '',
        price: 0,
        mrp: 0,
        discount: 0,
        stock: 0,
        imageUrl: '',
      });
      closeCreateModal();
      await load();
    } catch (err) {
      setCreateError(toErrorMessage(err) || 'Failed to create product');
    } finally {
      setCreating(false);
    }
  };

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
          <div className="table-container">
            <DataTable<ProductRow>
              columns={columns}
              rows={(products ?? []) as ProductRow[]}
              page={page}
              pageSize={pageSize}
              total={total}
              onPageChange={setPage}
              loading={loading}
            />
          </div>
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
            className="modal-content admin-products__modalForm"
            onSubmit={(event) => {
              event.preventDefault();
              void handleCreateProduct();
            }}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <h3 id="admin-create-product-heading">Add Product</h3>
                <p className="admin-products__subtitle">
                  Provide details to list a new product for sale.
                </p>
              </div>
              <button
                type="button"
                className="ghost"
                onClick={closeCreateModal}
                aria-label="Close create product modal"
                disabled={creating}
              >
                ×
              </button>
            </div>

            <label>
              Shop
              <select
                value={createFormValues.shopId}
                onChange={(event) =>
                  setCreateFormValues((prev) => ({
                    ...prev,
                    shopId: event.target.value,
                  }))
                }
                required
                disabled={shopsLoading || approvedShops.length === 0}
              >
                <option value="">
                  {shopsLoading
                    ? 'Loading shops...'
                    : approvedShops.length > 0
                      ? 'Select shop'
                      : 'No approved shops available'}
                </option>
                {approvedShops.map((s) => (
                  <option key={s._id} value={s._id}>
                    {s.name}
                  </option>
                ))}
              </select>
              {createFieldErrors.shopId ? (
                <span className="field-error">{createFieldErrors.shopId}</span>
              ) : null}
            </label>

            <label>
              Product name
              <input
                placeholder="Iced latte, headphones, ..."
                value={createFormValues.name}
                onChange={(event) =>
                  setCreateFormValues((prev) => ({
                    ...prev,
                    name: event.target.value,
                  }))
                }
                required
                minLength={3}
              />
              {createFieldErrors.name ? (
                <span className="field-error">{createFieldErrors.name}</span>
              ) : null}
            </label>

            <label>
              Description
              <textarea
                rows={3}
                placeholder="What makes this item special?"
                value={createFormValues.description}
                onChange={(event) =>
                  setCreateFormValues((prev) => ({
                    ...prev,
                    description: event.target.value,
                  }))
                }
                required
                minLength={10}
              />
              {createFieldErrors.description ? (
                <span className="field-error">{createFieldErrors.description}</span>
              ) : null}
            </label>

            <label>
              Category
              <input
                placeholder="Beverages, electronics, ..."
                value={createFormValues.category}
                onChange={(event) =>
                  setCreateFormValues((prev) => ({
                    ...prev,
                    category: event.target.value,
                  }))
                }
                required
                minLength={2}
              />
              {createFieldErrors.category ? (
                <span className="field-error">{createFieldErrors.category}</span>
              ) : null}
            </label>

            <div className="admin-products__modalGrid">
              <label>
                Price (₹)
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={createFormValues.price}
                  onChange={(event) => {
                    lastPriceChangeSource.current = 'price';
                    setCreateFormValues((prev) => ({
                      ...prev,
                      price: Number(event.target.value),
                    }));
                  }}
                  required
                />
                {createFieldErrors.price ? (
                  <span className="field-error">{createFieldErrors.price}</span>
                ) : null}
              </label>

              <label>
                MRP (₹)
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={createFormValues.mrp}
                  onChange={(event) =>
                    setCreateFormValues((prev) => ({
                      ...prev,
                      mrp: Number(event.target.value),
                    }))
                  }
                  required
                />
                {createFieldErrors.mrp ? (
                  <span className="field-error">{createFieldErrors.mrp}</span>
                ) : null}
              </label>

              <label>
                Discount (%)
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={1}
                  value={createFormValues.discount}
                  onChange={(event) => {
                    lastPriceChangeSource.current = 'discount';
                    setCreateFormValues((prev) => ({
                      ...prev,
                      discount: Number(event.target.value),
                    }));
                  }}
                />
                {createFieldErrors.discount ? (
                  <span className="field-error">{createFieldErrors.discount}</span>
                ) : null}
              </label>

              <label>
                Stock
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={createFormValues.stock}
                  onChange={(event) =>
                    setCreateFormValues((prev) => ({
                      ...prev,
                      stock: Number(event.target.value),
                    }))
                  }
                />
                {createFieldErrors.stock ? (
                  <span className="field-error">{createFieldErrors.stock}</span>
                ) : null}
              </label>
            </div>

            <label>
              Image URL
              <input
                placeholder="https://example.com/image.jpg"
                value={createFormValues.imageUrl}
                onChange={(event) =>
                  setCreateFormValues((prev) => ({
                    ...prev,
                    imageUrl: event.target.value,
                  }))
                }
              />
              {createFieldErrors.imageUrl ? (
                <span className="field-error">{createFieldErrors.imageUrl}</span>
              ) : null}
            </label>

            <label className="file-upload">
              Upload image
              <input type="file" accept="image/*" onChange={handleCreateImageUpload} />
              <span className="hint">
                JPEG or PNG up to 2 MB. Uploaded images override the URL.
              </span>
            </label>
            {createImagePreview ? (
              <img
                src={createImagePreview}
                alt="Preview"
                className="admin-products__imagePreview"
              />
            ) : null}
            <div className="admin-products__modalActions">
              <button type="submit" disabled={creating}>
                {creating ? 'Saving…' : 'Save product'}
              </button>
              <button type="button" onClick={closeCreateModal} disabled={creating}>
                Cancel
              </button>
            </div>
            {createError ? <div className="modal-error">{createError}</div> : null}
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
            className="modal-content modal-form"
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
                required
                minLength={3}
              />
            </label>
            <label>
              Description
              <textarea
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                required
                minLength={10}
              />
            </label>
            <label>
              Category
              <input
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                required
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
                min={0}
                step={0.01}
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
                min={0}
                step={0.01}
                required
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
                min={0}
              />
            </label>
            <label>
              Image URL
              <input
                value={form.imageUrl}
                onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
                placeholder="https://example.com/image.jpg"
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
