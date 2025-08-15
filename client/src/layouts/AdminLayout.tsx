import { Link, Outlet } from 'react-router-dom';
import './AdminLayout.scss';

const AdminLayout = () => {
  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <nav>
          <ul>
            <li><Link to="/admin">Dashboard</Link></li>
            <li><Link to="/admin/requests">Requests</Link></li>
            <li><Link to="/admin/shops">Shops</Link></li>
            <li><span>Products</span></li>
            <li><span>Events</span></li>
            <li><span>Users</span></li>
            <li><span>Analytics</span></li>
          </ul>
        </nav>
      </aside>
      <div className="admin-content">
        <header className="admin-topbar">
          <input type="text" placeholder="Search..." />
          <div className="quick-actions">Quick Actions</div>
        </header>
        <main className="admin-main">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
