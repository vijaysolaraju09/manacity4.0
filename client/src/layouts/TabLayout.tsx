import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { useSelector, useDispatch } from "react-redux";
import { Bell, CalendarDays, Gift, Home, Package, ShoppingCart, Store, UserRound, Users } from "lucide-react";
import NavItem from "@/components/navigation/NavItem";
import Sidebar from "@/components/layout/Sidebar";
import type { RootState, AppDispatch } from "../store";
import { fetchNotifs } from "@/store/notifs";
import { selectItemCount } from "@/store/slices/cartSlice";
import { paths } from "@/routes/paths";
import "./TabLayout.scss";

const TabLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const unread = useSelector((state: RootState) => state.notifs.unread);
  const notifStatus = useSelector((state: RootState) => state.notifs.status);
  const isAuthenticated = useSelector((state: RootState) => Boolean(state.auth.token));
  const isBusinessUser = useSelector((state: RootState) => state.auth.user?.role === 'business');
  const cartItemCount = useSelector(selectItemCount);
  const dispatch = useDispatch<AppDispatch>();

  const hasBootstrapped = useRef(false);

  useEffect(() => {
    if (!isAuthenticated) return;
    if (notifStatus === 'idle' || !hasBootstrapped.current) {
      hasBootstrapped.current = true;
      dispatch(fetchNotifs({ page: 1 }));
    }
  }, [notifStatus, dispatch, isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) return undefined;
    const interval = window.setInterval(() => {
      dispatch(fetchNotifs({ page: 1 }));
    }, 60000);
    return () => {
      window.clearInterval(interval);
    };
  }, [dispatch, isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) return undefined;
    const refresh = () => {
      dispatch(fetchNotifs({ page: 1 }));
    };
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        refresh();
      }
    };
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [dispatch, isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) return;
    dispatch(fetchNotifs({ page: 1 }));
  }, [dispatch, isAuthenticated, location.pathname]);

  const tabs = [
    { name: "Home", icon: Home, path: paths.home() },
    { name: "Shops", icon: Store, path: paths.shops() },
    {
      name: "Services",
      icon: Users,
      path: paths.services.catalog(),
    },
    { name: "Events", icon: CalendarDays, path: paths.events.list() },
    ...(isBusinessUser ? [{ name: "Manage", icon: Package, path: paths.manageProducts() }] : []),
  ];

  useEffect(() => {
    if (location.pathname === paths.root()) navigate(paths.home());
  }, [location.pathname, navigate]);

  return (
    <div className="tab-layout bg-surface0 dark:bg-surface0 text-hi">
      <div className="w-full min-h-screen md:grid md:grid-cols-[auto_1fr]">
        <Sidebar />
        <div className="flex min-h-screen flex-col">
          <motion.header
            className="top-header appbar text-hi"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h1 className="logo" onClick={() => navigate(paths.home())}>Manacity</h1>
            <div className="actions">
              <NavItem
                to={paths.cart()}
                icon={ShoppingCart}
                label="Cart"
                ariaLabel="Cart"
                badge={cartItemCount > 0 ? (cartItemCount > 99 ? "99+" : cartItemCount) : undefined}
              />
              <NavItem
                to={paths.notifications()}
                icon={Bell}
                label="Notifications"
                ariaLabel="Notifications"
                badge={unread > 0 ? (unread > 99 ? "99+" : unread) : undefined}
              />
              <NavItem to={paths.profile()} icon={UserRound} label="Profile" ariaLabel="Profile" />
            </div>
          </motion.header>
          <main className="tab-content">
            <Outlet />
          </main>

          <motion.button
            type="button"
            className="special-shop-btn fab focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
            onClick={() => navigate(paths.specialShop())}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            aria-label="Special shop"
          >
            <Gift className="icon h-5 w-5" aria-hidden="true" />
          </motion.button>

          <motion.nav
            className="tab-bar tabs bottom-nav bottom-glass md:hidden"
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.4 }}
            aria-label="Primary navigation"
          >
            <div className="desktop-extras">
              <h1 className="sidebar-logo" onClick={() => navigate(paths.home())}>
                Manacity
              </h1>
              <nav className="flex w-full flex-col gap-3" aria-label="Secondary navigation">
                <div className="flex items-center gap-2">
                  <NavItem
                    to={paths.cart()}
                    icon={ShoppingCart}
                    label="Cart"
                    ariaLabel="Cart"
                    badge={cartItemCount > 0 ? (cartItemCount > 99 ? '99+' : cartItemCount) : undefined}
                  />
                  <NavItem
                    to={paths.notifications()}
                    icon={Bell}
                    label="Notifications"
                    ariaLabel="Notifications"
                    badge={unread > 0 ? (unread > 99 ? '99+' : unread) : undefined}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <NavItem
                    to={paths.profile()}
                    icon={UserRound}
                    label="Profile"
                    ariaLabel="Profile"
                    variant="default"
                  />
                </div>
              </nav>
            </div>
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.name}
                  type="button"
                  className={
                    location.pathname === tab.path
                      ? 'tab active bottom-nav__item bottom-nav__item--active relative text-brand-500 after:absolute after:-bottom-2 after:left-1/2 after:h-0.5 after:w-8 after:-translate-x-1/2 after:rounded-full after:bg-brand-500'
                      : 'tab bottom-nav__item relative text-md'
                  }
                  onClick={() => navigate(tab.path)}
                  aria-label={tab.name}
                >
                  <Icon className="icon h-5 w-5" aria-hidden="true" />
                  <span>{tab.name}</span>
                </button>
              );
            })}
          </motion.nav>
        </div>
      </div>
    </div>
  );
};

export default TabLayout;
