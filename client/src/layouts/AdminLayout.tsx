import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { clearAdminToken } from '@/store/slices/adminSlice';
import type { AppDispatch } from '@/store';
import { paths } from '@/routes/paths';
import './AdminLayout.scss';

const AdminLayout = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();

  const handleLogout = () => {
    dispatch(clearAdminToken());
    navigate(paths.admin.login());
  };

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <nav>
          <ul>
            <li>
              <NavLink to={paths.admin.root()} end>
                Dashboard
              </NavLink>
            </li>
            <li className="nav-group">
              <span className="nav-group__label">Requests</span>
              <ul>
                <li>
                  <NavLink to={paths.admin.requests.business()}>
                    Business Requests
                  </NavLink>
                </li>
                <li>
                  <NavLink to={paths.admin.requests.verification()}>
                    Verification Requests
                  </NavLink>
                </li>
              </ul>
            </li>
            <li>
              <NavLink to={paths.admin.shops()}>Shops</NavLink>
            </li>
            <li>
              <NavLink to={paths.admin.products()}>Products</NavLink>
            </li>
            <li>
              <NavLink to={paths.admin.events.list()}>Events</NavLink>
            </li>
            <li>
              <NavLink to={paths.admin.users()}>Users</NavLink>
            </li>
            <li>
              <NavLink to={paths.admin.analytics()}>Analytics</NavLink>
            </li>
            <li>
              <NavLink to={paths.admin.services()}>Services</NavLink>
            </li>
            <li>
              <NavLink to={paths.admin.serviceRequests()}>Service Requests</NavLink>
            </li>
          </ul>
        </nav>
      </aside>
      <div className="admin-content">
        <header className="admin-topbar">
          <input type="text" placeholder="Search..." />
          <div className="admin-topbar__actions">
            <div className="quick-actions">Quick Actions</div>
            <button type="button" className="admin-logout" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </header>
        <main className="admin-main">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
