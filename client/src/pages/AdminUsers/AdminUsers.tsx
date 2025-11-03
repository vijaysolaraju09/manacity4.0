import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Ban,
  BadgeCheck,
  RefreshCcw,
  ShieldQuestion,
  Trash2,
  UserCog,
} from 'lucide-react';
import {
  fetchUsers,
  updateUserRole,
  updateUserStatus,
  deleteUser as apiDeleteUser,
  type UserQueryParams,
} from '@/api/admin';
import AdminTable, { type AdminTableColumn } from '@/components/admin/AdminTable';
import FilterBar, { type DateRangeValue } from '@/components/admin/FilterBar';
import { Button } from '@/components/ui/button';
import Badge from '@/components/ui/badge';
import ErrorCard from '@/components/ui/ErrorCard';
import Select from '@/components/ui/select';
import SkeletonList from '@/components/ui/SkeletonList';
import showToast from '@/components/ui/Toast';
import styles from './AdminUsers.module.scss';

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

interface UserRow extends User {
  [key: string]: unknown;
}

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
  const [createdRange, setCreatedRange] = useState<DateRangeValue>({});

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
        createdFrom: createdRange.from || undefined,
        createdTo: createdRange.to || undefined,
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
  }, [createdRange, page, pageSize, query, role, sort, verified]);

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

  const sortState = useMemo(() => {
    const direction = sort.startsWith('-') ? 'desc' : 'asc';
    const key = sort.replace(/^-/, '') || 'createdAt';
    return { key, direction: direction as 'asc' | 'desc' };
  }, [sort]);

  const handleSortChange = (key: string, direction: 'asc' | 'desc') => {
    setSort(direction === 'asc' ? key : `-${key}`);
  };

  const handleResetFilters = () => {
    setQuery('');
    setRole('');
    setVerified('');
    setCreatedRange({});
    setPage(1);
  };

  const formatDate = useCallback((value: string) => {
    try {
      return new Intl.DateTimeFormat('en-IN', {
        dateStyle: 'medium',
      }).format(new Date(value));
    } catch (error) {
      return new Date(value).toLocaleDateString();
    }
  }, []);

  const columns: AdminTableColumn<UserRow>[] = useMemo(() => {
    return [
      {
        key: 'name',
        header: 'User',
        className: styles.th,
        cellClassName: styles.td,
        render: (user) => (
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[color:var(--brand-500)]/12 text-sm font-semibold uppercase text-[color:var(--brand-600)] dark:bg-[color:var(--brand-500)]/20 dark:text-[color:var(--brand-200)]">
              {user.name?.[0]?.toUpperCase() ?? 'U'}
            </span>
            <div className="space-y-1">
              <p className="font-medium text-text-primary dark:text-text-primary">{user.name || 'Unnamed user'}</p>
              <p className="text-xs text-text-muted dark:text-text-muted">{user.phone || '—'}</p>
            </div>
          </div>
        ),
      },
      {
        key: 'role',
        header: 'Role',
        className: styles.th,
        cellClassName: styles.td,
        render: (user) => (
          <div className="flex items-center gap-2">
            <Select
              value={user.role}
              onChange={(event) => handleRoleChange(user._id, event.target.value)}
              className="w-36 rounded-full bg-surface-1/80 dark:bg-surface-1"
            >
              <option value="customer">Customer</option>
              <option value="verified">Verified</option>
              <option value="business">Business</option>
              <option value="admin">Admin</option>
            </Select>
            {user.role === 'admin' ? (
              <Badge variant="outline" className="gap-1">
                <UserCog className="h-3.5 w-3.5" aria-hidden="true" />
                Admin
              </Badge>
            ) : null}
          </div>
        ),
      },
      {
        key: 'isVerified',
        header: 'Verification',
        className: styles.th,
        cellClassName: styles.td,
        render: (user) =>
          user.isVerified ? (
            <span className={`${styles.statusChip} ${styles.statusApproved}`}>
              <BadgeCheck className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
              Verified
            </span>
          ) : (
            <span className={`${styles.statusChip} ${styles.statusPending}`}>
              <ShieldQuestion className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
              Pending
            </span>
          ),
      },
      {
        key: 'ordersCount',
        header: 'Orders',
        align: 'center',
        className: styles.th,
        cellClassName: styles.td,
        render: (user) => (
          <span className="inline-flex min-w-[3rem] items-center justify-center rounded-full bg-surface-2 px-3 py-1 text-sm font-semibold text-text-secondary dark:bg-surface-2/70 dark:text-text-primary">
            {user.ordersCount ?? 0}
          </span>
        ),
      },
      {
        key: 'createdAt',
        header: 'Joined',
        sortable: true,
        className: styles.th,
        cellClassName: styles.td,
        render: (user) => (
          <span className="text-sm text-text-secondary dark:text-text-secondary">{formatDate(user.createdAt)}</span>
        ),
      },
      {
        key: 'actions',
        header: 'Actions',
        align: 'right',
        className: styles.th,
        cellClassName: `${styles.td} ${styles.actions}`,
        render: (user) => (
          <div className={`${styles.actions} flex flex-wrap items-center justify-end`}>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-full border-borderc/40 text-xs text-text-secondary hover:border-[color:var(--brand-200)] hover:text-[color:var(--brand-600)] dark:border-borderc/40 dark:text-text-secondary dark:hover:border-[color:var(--brand-400)] dark:hover:text-[color:var(--brand-200)]"
              onClick={() => handleToggleActive(user)}
            >
              {user.isActive ? (
                <>
                  <Ban className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                  Suspend
                </>
              ) : (
                <>
                  <RefreshCcw className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                  Activate
                </>
              )}
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              className="rounded-full text-xs"
              onClick={() => handleDelete(user._id)}
            >
              <Trash2 className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
              Delete
            </Button>
          </div>
        ),
      },
    ];
  }, [formatDate, handleRoleChange, handleToggleActive, handleDelete]);

  const hasUsers = users.length > 0;
  const hasActiveFilters = Boolean(
    query || role || verified || createdRange.from || createdRange.to,
  );

  return (
    <div className={`${styles.page} space-y-6 px-4`}>
      <div className={styles.header}>
        <h1 className="text-2xl font-semibold text-text-primary dark:text-text-primary">Users</h1>
        <p className="text-sm text-text-muted dark:text-text-muted">
          Monitor user roles, verification status, and account activity in one place.
        </p>
      </div>

      <div className={styles.toolbar}>
        <FilterBar
          searchPlaceholder="Search name or phone"
          searchValue={query}
          onSearchChange={(value) => {
            setQuery(value);
            setPage(1);
          }}
          filters={[
            {
              id: 'role',
              label: 'Role',
              value: role,
              placeholder: 'All roles',
              options: [
                { label: 'Customer', value: 'customer' },
                { label: 'Verified', value: 'verified' },
                { label: 'Business', value: 'business' },
                { label: 'Admin', value: 'admin' },
              ],
              onChange: (value) => {
                setRole(value);
                setPage(1);
              },
            },
            {
              id: 'verification',
              label: 'Verification',
              value: verified,
              placeholder: 'All users',
              options: [
                { label: 'Verified', value: 'true' },
                { label: 'Unverified', value: 'false' },
              ],
              onChange: (value) => {
                setVerified(value);
                setPage(1);
              },
            },
          ]}
          dateRange={{
            value: createdRange,
            onChange: (value) => {
              setCreatedRange(value);
              setPage(1);
            },
            label: 'Joined between',
          }}
          onReset={hasActiveFilters ? handleResetFilters : undefined}
        />
      </div>

      {loading && !hasUsers ? <SkeletonList count={pageSize} /> : null}

      {error ? (
        <ErrorCard
          message={error}
          onRetry={() => {
            void load();
          }}
        />
      ) : null}

      {!error ? (
        <AdminTable<UserRow>
          data={(users ?? []) as UserRow[]}
          columns={columns}
          isLoading={loading}
          skeletonRows={pageSize}
          emptyState={
            <div className="space-y-2 text-center">
              <h3 className="text-base font-semibold text-text-primary dark:text-text-primary">No users found</h3>
              <p className="text-sm text-text-muted dark:text-text-muted">
                Adjust your filters or refresh to see recent signups.
              </p>
              <Button type="button" variant="outline" className="rounded-full" onClick={() => void load()}>
                Refresh
              </Button>
            </div>
          }
          caption={
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="text-sm text-text-secondary dark:text-text-muted">
                Showing page {page} of {Math.max(1, Math.ceil(total / pageSize))}
              </span>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="rounded-full"
                  onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                  disabled={page <= 1}
                >
                  Previous
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="rounded-full"
                  onClick={() => setPage((prev) => (prev * pageSize < total ? prev + 1 : prev))}
                  disabled={page * pageSize >= total}
                >
                  Next
                </Button>
              </div>
            </div>
          }
          sortState={sortState}
          onSort={handleSortChange}
          className={styles.tableWrap}
        />
      ) : null}
    </div>
  );
};

export default AdminUsers;
