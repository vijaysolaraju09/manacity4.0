import { useCallback, useEffect, useState } from 'react';
import {
  fetchUsers,
  updateUserRole,
  updateUserStatus,
  deleteUser as apiDeleteUser,
  type UserQueryParams,
} from '../../api/admin';
import DataTable, { type Column } from '../../components/admin/DataTable';
import EmptyState from '../../components/ui/EmptyState';
import ErrorCard from '../../components/ui/ErrorCard';
import SkeletonList from '../../components/ui/SkeletonList';
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

type UserRow = User & { actions?: string };

const AdminUsers = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [role, setRole] = useState('');
  const [verified, setVerified] = useState('');
  const [sort, setSort] = useState('-createdAt');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 10;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
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
      const items = Array.isArray(data.items) ? (data.items as User[]) : [];
      setUsers(items);
      setTotal(typeof data.total === 'number' ? data.total : items.length);
    } catch {
      setError('Failed to load users');
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

  const columns: Column<UserRow>[] = [
    { key: 'name', label: 'Name' },
    { key: 'phone', label: 'Phone' },
    {
      key: 'role',
      label: 'Role',
      render: (u) => (
        <select
          value={u.role}
          onChange={(e) => handleRoleChange(u._id, e.target.value)}
        >
          <option value="customer">Customer</option>
          <option value="verified">Verified</option>
          <option value="business">Business</option>
          <option value="admin">Admin</option>
        </select>
      ),
    },
    {
      key: 'isVerified',
      label: 'Verified',
      render: (u) => (u.isVerified ? 'Yes' : 'No'),
    },
    { key: 'ordersCount', label: 'Orders' },
    {
      key: 'createdAt',
      label: 'Created',
      render: (u) => new Date(u.createdAt).toLocaleDateString(),
    },
    {
      key: 'actions',
      label: '',
      render: (u) => (
        <div className="actions">
          <button onClick={() => handleToggleActive(u)}>
            {u.isActive ? 'Deactivate' : 'Reactivate'}
          </button>
          <button className="danger" onClick={() => handleDelete(u._id)}>
            Delete
          </button>
        </div>
      ),
    },
  ];

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
      {(() => {
        const hasUsers = (users ?? []).length > 0;
        if (loading && !hasUsers) {
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
        if (!loading && !hasUsers) {
          return (
            <EmptyState
              title="No users found"
              message="Update your search filters or refresh to load user accounts."
              ctaLabel="Refresh"
              onCtaClick={() => {
                void load();
              }}
            />
          );
        }
        return (
          <DataTable<UserRow>
            columns={columns}
            rows={(users ?? []) as UserRow[]}
            page={page}
            pageSize={pageSize}
            total={total}
            onPageChange={setPage}
            onSort={(key, dir) => setSort(dir === 'asc' ? key : `-${key}`)}
            loading={loading}
          />
        );
      })()}
    </div>
  );
};

export default AdminUsers;
