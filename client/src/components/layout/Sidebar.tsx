/* A responsive, mini→expanded sidebar. Mobile uses your existing bottom nav; we only render this on md+ */
import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  Home,
  Bell,
  Store,
  PackageOpen,
  Users,
  CalendarDays,
  History,
  Settings,
  Package,
  ClipboardList,
} from 'lucide-react'; // or your existing icon set
import { useSelector } from 'react-redux';
import { paths } from '@/routes/paths';
import type { RootState } from '@/store';

type Item = { to: string; label: string; icon: React.ReactNode; badge?: number };

export default function Sidebar() {
  const role = useSelector((state: RootState) => state.auth.user?.role?.toLowerCase());
  const businessStatus = useSelector((state: RootState) => state.auth.user?.businessStatus);
  const businessNavVisible =
    ['business', 'provider'].includes(role ?? '') || businessStatus === 'approved';

  const items: Item[] = [
    { to: paths.home(), label: 'Home', icon: <Home className="mc-item__icon" /> },
    { to: paths.shops(), label: 'Shops', icon: <Store className="mc-item__icon" /> },
    {
      to: paths.services.available(),
      label: 'Services',
      icon: <PackageOpen className="mc-item__icon" />,
    },
    { to: paths.history(), label: 'History', icon: <History className="mc-item__icon" /> },
    { to: paths.events.list(), label: 'Events', icon: <CalendarDays className="mc-item__icon" /> },
    {
      to: paths.notifications(),
      label: 'Notifications',
      icon: <Bell className="mc-item__icon" />,
      badge: 0,
    },
    { to: paths.profile(), label: 'Profile', icon: <Users className="mc-item__icon" /> },
    ...(businessNavVisible
      ? [
          {
            to: paths.manageProducts(),
            label: 'Manage products',
            icon: <Package className="mc-item__icon" />,
          },
          {
            to: paths.orders.received(),
            label: 'Orders received',
            icon: <ClipboardList className="mc-item__icon" />,
          },
        ]
      : []),
  ];

  const [open, setOpen] = React.useState(false);
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
        {items.map((it) => (
          <NavLink
            key={it.to}
            to={it.to}
            className={({ isActive }) => `mc-item relative overflow-hidden ${isActive ? 'mc-item--active' : ''}`}
            data-tip={it.label}
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <span
                    aria-hidden="true"
                    className="absolute left-1 top-1 bottom-1 w-1 rounded-full bg-gradient-to-b from-[rgb(var(--mc-accent))] to-[rgb(var(--mc-primary))]"
                  />
                )}
                {it.icon}
                <span className="mc-item__label">{it.label}</span>
                {typeof it.badge === 'number' && it.badge > 0 && <span className="mc-badge">{it.badge}</span>}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="mc-footer">
        <NavLink
          to={paths.settings()}
          className={({ isActive }) => `mc-item relative overflow-hidden ${isActive ? 'mc-item--active' : ''}`}
          data-tip="Settings"
        >
          {({ isActive }) => (
            <>
              {isActive && (
                <span
                  aria-hidden="true"
                  className="absolute left-1 top-1 bottom-1 w-1 rounded-full bg-gradient-to-b from-[rgb(var(--mc-accent))] to-[rgb(var(--mc-primary))]"
                />
              )}
              <Settings className="mc-item__icon" />
              <span className="mc-item__label">Settings</span>
            </>
          )}
        </NavLink>
        {/* Optional: theme chip if you have ThemeToggle elsewhere */}
        {/* <button className="mc-theme" onClick={()=>applyTheme('dark')}>Dark</button> */}
      </div>
    </aside>
  );
}
