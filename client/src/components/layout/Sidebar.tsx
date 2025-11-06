/* A responsive, mini→expanded sidebar. Mobile uses your existing bottom nav; we only render this on md+ */
import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Home, Bell, Store, PackageOpen, Users, CalendarDays, Settings } from 'lucide-react'; // or your existing icon set
import { paths } from '@/routes/paths';

type Item = { to: string; label: string; icon: React.ReactNode; badge?: number };

const items: Item[] = [
  { to: paths.home(), label: 'Home', icon: <Home className="mc-item__icon" /> },
  { to: paths.shops(), label: 'Shops', icon: <Store className="mc-item__icon" /> },
  { to: paths.services.catalog(), label: 'Services', icon: <PackageOpen className="mc-item__icon" /> },
  { to: paths.events.list(), label: 'Events', icon: <CalendarDays className="mc-item__icon" /> },
  { to: paths.notifications(), label: 'Notifications', icon: <Bell className="mc-item__icon" />, badge: 0 },
  { to: paths.profile(), label: 'Profile', icon: <Users className="mc-item__icon" /> },
];

export default function Sidebar() {
  const [open, setOpen] = React.useState(false);
  const { pathname } = useLocation();
  return (
    <aside
      className={`mc-sidebar ${open ? 'is-open' : ''} hidden md:grid`}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setOpen(false);
        }
      }}
      aria-label="Primary"
    >
      <NavLink to={paths.home()} className="mc-brand" data-tip="Home">
        <div className="mc-brand__logo">M</div>
        <div className="mc-brand__name">Manacity</div>
      </NavLink>

      <nav className="mc-nav" role="navigation">
        <div className="mc-section">Main</div>
        {items.map((it) => {
          const active = pathname.startsWith(it.to);
          return (
            <NavLink
              key={it.to}
              to={it.to}
              aria-current={active ? 'page' : undefined}
              className={`mc-item ${active ? 'mc-item--active' : ''}`}
              data-tip={it.label}
            >
              {it.icon}
              <span className="mc-item__label">{it.label}</span>
              {typeof it.badge === 'number' && it.badge > 0 && <span className="mc-badge">{it.badge}</span>}
            </NavLink>
          );
        })}
      </nav>

      <div className="mc-footer">
        <NavLink
          to={paths.settings()}
          className={({ isActive }) => `mc-item ${isActive ? 'mc-item--active' : ''}`}
          data-tip="Settings"
        >
          <Settings className="mc-item__icon" />
          <span className="mc-item__label">Settings</span>
        </NavLink>
        {/* Optional: theme chip if you have ThemeToggle elsewhere */}
        {/* <button className="mc-theme" onClick={()=>applyTheme('dark')}>Dark</button> */}
      </div>
    </aside>
  );
}
