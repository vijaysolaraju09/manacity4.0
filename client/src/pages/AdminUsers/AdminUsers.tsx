import { useCallback, useEffect, useState } from 'react';
import {
  fetchUsers,
  updateUserRole,
  updateUserStatus,
  deleteUser as apiDeleteUser,
  type UserQueryParams,
} from '../../api/admin';
import Loader from '../../components/Loader';
import showToast from '../../components/ui/Toast';
import './AdminUsers.scss';

interface User {
  _id: string;
  name: string;
  phone: string;
  role: string;
  isVerified: boolean;
  isActive: boolean;
  ordersCount: number;
  createdAt: string;
}

const AdminUsers = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [role, setRole] = useState('');
  const [verified, setVerified] = useState('');
  const [sort, setSort] = useState('-createdAt');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 10;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: UserQueryParams = {
        query: query || undefined,
        role: role || undefined,
        verified: verified ? verified === 'true' : undefined,
        sort,
        page,
        pageSize,
      };
      const data = await fetchUsers(params);
      setUsers(data.items as User[]);
      setTotal(data.total);
    } catch {
      showToast('Failed to load users', 'error');
    } finally {
      setLoading(false);
    }
  }, [query, role, verified, sort, page]);

  useEffect(() => {
    load();
  }, [load]);

  const handleRoleChange = async (id: string, newRole: string) => {
    const prev = [...users];
    setUsers((list) =>
      list.map((u) =>
        u._id === id
          ? { ...u, role: newRole, isVerified: newRole === 'verified' || u.isVerified }
          : u,
      ),
    );
    try {
      await updateUserRole(id, newRole);
    } catch {
      setUsers(prev);
      showToast('Failed to update role', 'error');
    }
  };

  const handleToggleActive = async (user: User) => {
    if (!confirm(user.isActive ? 'Deactivate user?' : 'Reactivate user?')) return;
    const prev = [...users];
    setUsers((list) =>
      list.map((u) =>
        u._id === user._id ? { ...u, isActive: !user.isActive } : u,
      ),
    );
    try {
      await updateUserStatus(user._id, !user.isActive);
    } catch {
      setUsers(prev);
      showToast('Failed to update status', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete user?')) return;
    const prev = [...users];
    setUsers((list) => list.filter((u) => u._id !== id));
    try {
      await apiDeleteUser(id);
    } catch {
      setUsers(prev);
      showToast('Failed to delete user', 'error');
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="admin-users">
      <h2>Users</h2>
      <div className="filters">
        <input
          placeholder="Search name or phone"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setPage(1);
          }}
        />
        <select
          value={role}
          onChange={(e) => {
            setRole(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All Roles</option>
          <option value="customer">Customer</option>
          <option value="verified">Verified</option>
          <option value="business">Business</option>
          <option value="admin">Admin</option>
        </select>
        <select
          value={verified}
          onChange={(e) => {
            setVerified(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All Users</option>
          <option value="true">Verified</option>
          <option value="false">Unverified</option>
        </select>
        <select value={sort} onChange={(e) => setSort(e.target.value)}>
          <option value="-createdAt">Newest</option>
          <option value="createdAt">Oldest</option>
        </select>
      </div>
      {loading ? (
        <Loader />
      ) : (
        <table className="users-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Phone</th>
              <th>Role</th>
              <th>Verified</th>
              <th>Orders</th>
              <th>Created</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u._id}>
                <td>{u.name}</td>
                <td>{u.phone}</td>
                <td>
                  <select
                    value={u.role}
                    onChange={(e) => handleRoleChange(u._id, e.target.value)}
                  >
                    <option value="customer">Customer</option>
                    <option value="verified">Verified</option>
                    <option value="business">Business</option>
                    <option value="admin">Admin</option>
                  </select>
                </td>
                <td>{u.isVerified ? 'Yes' : 'No'}</td>
                <td>{u.ordersCount}</td>
                <td>{new Date(u.createdAt).toLocaleDateString()}</td>
                <td className="actions">
                  <button onClick={() => handleToggleActive(u)}>
                    {u.isActive ? 'Deactivate' : 'Reactivate'}
                  </button>
                  <button
                    className="danger"
                    onClick={() => handleDelete(u._id)}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <nav className="pagination" aria-label="Pagination">
        <button
          type="button"
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page <= 1}
        >
          Prev
        </button>
        <span>
          {page} / {totalPages}
        </span>
        <button
          type="button"
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          disabled={page >= totalPages}
        >
          Next
        </button>
      </nav>
    </div>
  );
};

export default AdminUsers;
