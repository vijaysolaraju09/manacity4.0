import { useCallback, useEffect, useState } from 'react';
import {
  fetchProducts,
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
      <h2>Products</h2>
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
      {edit && (
        <div className="modal">
          <form className="modal-content" onSubmit={handleSave}>
            <h3>Edit Product</h3>
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
