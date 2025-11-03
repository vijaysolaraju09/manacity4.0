import { useCallback, useEffect, useMemo, useState } from 'react';
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
import showToast from '../../components/ui/Toast';
import styles from './AdminShops.module.scss';

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

const statusLabels: Record<Shop['status'], string> = {
  active: 'Active',
  pending: 'Pending',
  suspended: 'Suspended',
};

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

  const handleToggleStatus = useCallback(async (shop: Shop) => {
    try {
      const newStatus = shop.status === 'active' ? 'suspended' : 'active';
      await apiUpdateShop(shop._id, { status: newStatus });
      setShops((prev) =>
        prev.map((s) => (s._id === shop._id ? { ...s, status: newStatus } : s)),
      );
    } catch {
      showToast('Failed to update status', 'error');
    }
  }, []);

  const handleDelete = useCallback(
    async (id: string) => {
      if (!confirm('Delete shop?')) return;
      try {
        await apiDeleteShop(id);
        setShops((prev) => prev.filter((s) => s._id !== id));
        showToast('Shop deleted');
        load();
      } catch {
        showToast('Failed to delete shop', 'error');
      }
    },
    [load],
  );

  const rows: ShopRow[] = useMemo(
    () => (shops ?? []).map((shop) => ({ ...shop })),
    [shops],
  );

  const columns: Column<ShopRow>[] = useMemo(
    () => [
      { key: 'name', label: 'Name' },
      { key: 'owner', label: 'Owner' },
      { key: 'category', label: 'Category' },
      { key: 'location', label: 'Location' },
      {
        key: 'status',
        label: 'Status',
        render: (s) => {
          const normalized = (s.status || 'pending').toLowerCase() as Shop['status'];
          const className =
            normalized === 'active'
              ? styles.statusApproved
              : normalized === 'suspended'
              ? styles.statusRejected
              : styles.statusPending;
          return (
            <span className={`${styles.statusChip} ${className}`}>
              {statusLabels[normalized] ?? 'Status'}
            </span>
          );
        },
      },
      { key: 'productsCount', label: 'Products' },
      {
        key: 'createdAt',
        label: 'Created',
        render: (s) => new Date(s.createdAt).toLocaleDateString(),
      },
      {
        key: 'actions',
        label: 'Actions',
        render: (s) => (
          <>
            <button onClick={() => setEdit(s)}>Edit</button>
            <button onClick={() => handleToggleStatus(s)}>
              {s.status === 'active' ? 'Suspend' : 'Activate'}
            </button>
            <button onClick={() => handleDelete(s._id)}>Delete</button>
          </>
        ),
      },
    ],
    [handleDelete, handleToggleStatus],
  );

  const hasShops = rows.length > 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className={`${styles.page} space-y-6 px-4`}>
      <div className="space-y-1">
        <h2 className="text-2xl font-semibold text-text-primary">Shops</h2>
        <p className="text-sm text-text-secondary">
          Manage storefronts, update statuses, and keep listings current.
        </p>
      </div>

      <div className={styles.toolbar}>
        <div className={styles.filtersGroup}>
          <input
            placeholder="Search by name or owner"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
            className="w-48 rounded-lg border border-borderc/40 px-3 py-2 text-sm text-text-secondary"
          />
          <input
            placeholder="Category"
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
              setPage(1);
            }}
            className="w-40 rounded-lg border border-borderc/40 px-3 py-2 text-sm text-text-secondary"
          />
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            className="rounded-lg border border-borderc/40 bg-surface-1 px-3 py-2 text-sm text-text-secondary"
          >
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="pending">Pending</option>
            <option value="suspended">Suspended</option>
          </select>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="rounded-lg border border-borderc/40 bg-surface-1 px-3 py-2 text-sm text-text-secondary"
          >
            <option value="-createdAt">Newest</option>
            <option value="createdAt">Oldest</option>
          </select>
        </div>
        <span className="text-sm text-text-muted">Total shops: {total}</span>
      </div>

      {(() => {
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
            rows={rows}
            page={page}
            pageSize={pageSize}
            total={total}
            onPageChange={setPage}
            loading={loading}
            classNames={{
              tableWrap: styles.tableWrap,
              table: styles.table,
              th: styles.th,
              td: styles.td,
              row: styles.row,
              actions: styles.actions,
              empty: styles.td,
            }}
          />
        );
      })()}

      {hasShops ? (
        <div className={styles.tableFooter}>
          <span>
            Showing page {page} of {totalPages}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="rounded-md border border-borderc/40 px-3 py-1 text-sm text-text-secondary"
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              disabled={page <= 1}
            >
              Previous
            </button>
            <button
              type="button"
              className="rounded-md border border-borderc/40 px-3 py-1 text-sm text-text-secondary"
              onClick={() => setPage((prev) => (prev < totalPages ? prev + 1 : prev))}
              disabled={page >= totalPages}
            >
              Next
            </button>
          </div>
        </div>
      ) : null}

      {edit && (
        <div className={styles.modal}>
          <form className={styles.modalContent} onSubmit={handleSave}>
            <h3 className="text-lg font-semibold text-text-primary">Edit Shop</h3>
            <label className={styles.formField}>
              Name
              <input
                value={edit.name}
                onChange={(e) => setEdit({ ...edit, name: e.target.value })}
              />
            </label>
            <label className={styles.formField}>
              Category
              <input
                value={edit.category}
                onChange={(e) => setEdit({ ...edit, category: e.target.value })}
              />
            </label>
            <label className={styles.formField}>
              Location
              <input
                value={edit.location}
                onChange={(e) => setEdit({ ...edit, location: e.target.value })}
              />
            </label>
            <div className={styles.modalActions}>
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
