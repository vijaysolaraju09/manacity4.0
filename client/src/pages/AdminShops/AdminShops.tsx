import { useCallback, useEffect, useState } from 'react';
import {
  fetchShops,
  updateShop as apiUpdateShop,
  deleteShop as apiDeleteShop,
  type ShopQueryParams,
} from '../../api/admin';
import Loader from '../../components/Loader';
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

const AdminShops = () => {
  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(false);
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
      setShops(data.items);
      setTotal(data.total);
    } catch {
      showToast('Failed to load shops', 'error');
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

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

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
      {loading ? (
        <Loader />
      ) : (
        <table className="shops-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Owner</th>
              <th>Category</th>
              <th>Location</th>
              <th>Status</th>
              <th>Products</th>
              <th>Created</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {shops.map((s) => (
              <tr key={s._id}>
                <td>{s.name}</td>
                <td>{s.owner}</td>
                <td>{s.category}</td>
                <td>{s.location}</td>
                <td>{s.status}</td>
                <td>{s.productsCount}</td>
                <td>{new Date(s.createdAt).toLocaleDateString()}</td>
                <td className="actions">
                  <button onClick={() => setEdit(s)}>Edit</button>
                  <button onClick={() => handleToggleStatus(s)}>
                    {s.status === 'active' ? 'Suspend' : 'Activate'}
                  </button>
                  <button onClick={() => handleDelete(s._id)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <div className="pagination">
        <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
          Prev
        </button>
        <span>
          {page}/{totalPages}
        </span>
        <button
          disabled={page >= totalPages}
          onClick={() => setPage((p) => p + 1)}
        >
          Next
        </button>
      </div>
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
