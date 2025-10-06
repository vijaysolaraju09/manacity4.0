import { useCallback, useEffect, useState } from 'react';
import {
  fetchShops,
  updateShop as apiUpdateShop,
  deleteShop as apiDeleteShop,
  type ShopQueryParams,
} from '../../api/admin';
import DataTable, { type Column } from '../../components/admin/DataTable';
import EmptyState from '../../components/ui/EmptyState';
import ErrorCard from '../../components/ui/ErrorCard';
import SkeletonList from '../../components/ui/SkeletonList';
import StatusChip from '../../components/ui/StatusChip';
import showToast from '../../components/ui/Toast';
import './AdminShops.scss';

interface Shop {
  _id: string;
  name: string;
  owner: string;
  category: string;
  location: string;
  status: 'active' | 'pending' | 'suspended';
  productsCount: number;
  createdAt: string;
}

type ShopRow = Shop & { actions?: string };

const AdminShops = () => {
  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('');
  const [category, setCategory] = useState('');
  const [sort, setSort] = useState('-createdAt');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 10;

  const [edit, setEdit] = useState<Shop | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: ShopQueryParams = {
        query,
        status: status || undefined,
        category: category || undefined,
        sort,
        page,
        pageSize,
      };
      const data = await fetchShops(params);
      const items = Array.isArray(data.items) ? (data.items as Shop[]) : [];
      setShops(items);
      setTotal(typeof data.total === 'number' ? data.total : items.length);
    } catch {
      setError('Failed to load shops');
    } finally {
      setLoading(false);
    }
  }, [query, status, category, sort, page, pageSize]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!edit) return;
    try {
      setSaving(true);
      await apiUpdateShop(edit._id, {
        name: edit.name,
        category: edit.category,
        location: edit.location,
      });
      showToast('Shop updated');
      setEdit(null);
      load();
    } catch {
      showToast('Failed to update shop', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (shop: Shop) => {
    try {
      const newStatus = shop.status === 'active' ? 'suspended' : 'active';
      await apiUpdateShop(shop._id, { status: newStatus });
      setShops((prev) =>
        prev.map((s) => (s._id === shop._id ? { ...s, status: newStatus } : s)),
      );
    } catch {
      showToast('Failed to update status', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete shop?')) return;
    try {
      await apiDeleteShop(id);
      setShops((prev) => prev.filter((s) => s._id !== id));
      showToast('Shop deleted');
      load();
    } catch {
      showToast('Failed to delete shop', 'error');
    }
  };

  const columns: Column<ShopRow>[] = [
    { key: 'name', label: 'Name' },
    { key: 'owner', label: 'Owner' },
    { key: 'category', label: 'Category' },
    { key: 'location', label: 'Location' },
    {
      key: 'status',
      label: 'Status',
      render: (s) => <StatusChip status={s.status} />,
    },
    { key: 'productsCount', label: 'Products' },
    {
      key: 'createdAt',
      label: 'Created',
      render: (s) => new Date(s.createdAt).toLocaleDateString(),
    },
    {
      key: 'actions',
      label: '',
      render: (s) => (
        <div className="actions">
          <button onClick={() => setEdit(s)}>Edit</button>
          <button onClick={() => handleToggleStatus(s)}>
            {s.status === 'active' ? 'Suspend' : 'Activate'}
          </button>
          <button onClick={() => handleDelete(s._id)}>Delete</button>
        </div>
      ),
    },
  ];

  return (
    <div className="admin-shops">
      <h2>Shops</h2>
      <div className="filters">
        <input
          placeholder="Search by name or owner"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
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
          <option value="pending">Pending</option>
          <option value="suspended">Suspended</option>
        </select>
        <select value={sort} onChange={(e) => setSort(e.target.value)}>
          <option value="-createdAt">Newest</option>
          <option value="createdAt">Oldest</option>
        </select>
      </div>
      {(() => {
        const hasShops = (shops ?? []).length > 0;
        if (loading && !hasShops) {
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
        if (!loading && !hasShops) {
          return (
            <EmptyState
              title="No shops found"
              message="Try adjusting your filters or refresh to load the latest shops."
              ctaLabel="Refresh"
              onCtaClick={() => {
                void load();
              }}
            />
          );
        }
        return (
          <DataTable<ShopRow>
            columns={columns}
            rows={(shops ?? []) as ShopRow[]}
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
            <h3>Edit Shop</h3>
            <label>
              Name
              <input
                value={edit.name}
                onChange={(e) => setEdit({ ...edit, name: e.target.value })}
              />
            </label>
            <label>
              Category
              <input
                value={edit.category}
                onChange={(e) => setEdit({ ...edit, category: e.target.value })}
              />
            </label>
            <label>
              Location
              <input
                value={edit.location}
                onChange={(e) => setEdit({ ...edit, location: e.target.value })}
              />
            </label>
            <div className="modal-actions">
              <button type="submit" disabled={saving}>
                {saving ? 'Saving...' : 'Save'}
              </button>
              <button
                type="button"
                onClick={() => setEdit(null)}
                disabled={saving}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default AdminShops;
