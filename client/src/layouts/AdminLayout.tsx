import { NavLink, Outlet } from 'react-router-dom';
import './AdminLayout.scss';

const AdminLayout = () => {
  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <nav>
          <ul>
            <li>
              <NavLink to="/admin" end>
                Dashboard
              </NavLink>
            </li>
            <li className="nav-group">
              <span className="nav-group__label">Requests</span>
              <ul>
                <li>
                  <NavLink to="/admin/requests/business">
                    Business Requests
                  </NavLink>
                </li>
                <li>
                  <NavLink to="/admin/requests/verification">
                    Verification Requests
                  </NavLink>
                </li>
              </ul>
            </li>
            <li>
              <NavLink to="/admin/shops">Shops</NavLink>
            </li>
            <li>
              <NavLink to="/admin/products">Products</NavLink>
            </li>
            <li>
              <NavLink to="/admin/events">Events</NavLink>
            </li>
            <li>
              <NavLink to="/admin/users">Users</NavLink>
            </li>
            <li>
              <NavLink to="/admin/analytics">Analytics</NavLink>
            </li>
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
