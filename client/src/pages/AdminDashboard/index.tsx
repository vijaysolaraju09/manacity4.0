import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchUsers } from '../../api/admin';
import './AdminDashboard.scss';

interface User {
  _id: string;
  name: string;
  phone: string;
  role: string;
}

const AdminDashboard = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const data = await fetchUsers();
        const items = Array.isArray(data.items) ? (data.items as User[]) : [];
        setUsers(items);
      } catch {
        setUsers([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="admin-dashboard">
      <h1>Admin Dashboard</h1>
      <section className="admin-dashboard__grid">
        <div className="admin-dashboard__card">
          <p className="admin-dashboard__label">Active users</p>
          <p className="admin-dashboard__value">{loading ? '…' : users.length}</p>
        </div>
        <div className="admin-dashboard__card">
          <p className="admin-dashboard__label">Quick links</p>
          <div className="admin-dashboard__links">
            <Link to="/admin/shops">Manage shops</Link>
            <Link to="/admin/products">Manage products</Link>
            <Link to="/admin/services">Services</Link>
            <Link to="/admin/service-requests">Service requests</Link>
            <Link to="/admin/events">Events</Link>
          </div>
        </div>
      </section>
      <section>
        <h2>Users</h2>
        {loading ? (
          <p>Loading users…</p>
        ) : (
          <ul>
            {users.map((u) => (
              <li key={u._id}>{u.name} - {u.role}</li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
};

export default AdminDashboard;
