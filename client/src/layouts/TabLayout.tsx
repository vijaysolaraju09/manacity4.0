import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { useSelector, useDispatch } from "react-redux";
import {
  Bell,
  CalendarDays,
  Gift,
  History,
  Home,
  Monitor,
  Moon,
  ShoppingCart,
  Store,
  Sun,
  UserRound,
  Users,
} from "lucide-react";
import NavItem from "@/components/navigation/NavItem";
import Sidebar from "@/components/layout/Sidebar";
import type { RootState, AppDispatch } from "../store";
import { fetchNotifs } from "@/store/notifs";
import { selectItemCount } from "@/store/slices/cartSlice";
import { paths } from "@/routes/paths";
import "./TabLayout.scss";
import { useTheme } from "@/theme/ThemeProvider";

const TabLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const unread = useSelector((state: RootState) => state.notifs.unread);
  const notifStatus = useSelector((state: RootState) => state.notifs.status);
  const isAuthenticated = useSelector((state: RootState) => Boolean(state.auth.token));
  const cartItemCount = useSelector(selectItemCount);
  const dispatch = useDispatch<AppDispatch>();
  const { theme, setTheme, availableThemes } = useTheme();

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
      path: paths.services.available(),
    },
    { name: "Events", icon: CalendarDays, path: paths.events.list() },
    { name: "History", icon: History, path: paths.history() },
    { name: "Profile", icon: UserRound, path: paths.profile() },
  ];

  const iconMap = {
    light: Sun,
    dark: Moon,
    system: Monitor,
  } as const;

  const handleThemeToggle = () => {
    if (availableThemes.length === 0) return;
    const currentIndex = Math.max(0, availableThemes.indexOf(theme));
    const nextTheme = availableThemes[(currentIndex + 1) % availableThemes.length];
    setTheme(nextTheme);
  };

  const ThemeIcon = iconMap[theme] ?? Sun;
  const themeLabel = `${theme.charAt(0).toUpperCase()}${theme.slice(1)}`;

  useEffect(() => {
    if (!isAuthenticated) return;
    if (location.pathname === paths.root()) {
      navigate(paths.home(), { replace: true });
    }
  }, [isAuthenticated, location.pathname, navigate]);

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
              <button
                type="button"
                onClick={handleThemeToggle}
                aria-label={`Switch theme (current: ${themeLabel})`}
                title={`Switch theme (current: ${themeLabel})`}
                className="group relative inline-flex h-11 w-11 items-center justify-center gap-2 rounded-xl border border-transparent text-md transition-colors hover:text-hi focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-0"
              >
                <ThemeIcon className="icon h-5 w-5 text-current" aria-hidden="true" />
                <span className="sr-only">Switch theme</span>
              </button>
              <NavItem
                to={paths.notifications()}
                icon={Bell}
                label="Notifications"
                ariaLabel="Notifications"
                badge={unread > 0 ? (unread > 99 ? "99+" : unread) : undefined}
              />
              <NavItem
                to={paths.cart()}
                icon={ShoppingCart}
                label="Cart"
                ariaLabel="Cart"
                badge={cartItemCount > 0 ? (cartItemCount > 99 ? "99+" : cartItemCount) : undefined}
              />
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
            className="tab-bar tabs bottom-nav bottom-glass md:hidden fixed bottom-0 inset-x-0 z-50 flex items-center justify-between gap-2 px-4 py-2 bg-[rgba(var(--mc-surface),0.7)] backdrop-blur-md border-t border-[rgb(var(--mc-border)/0.7)] mc-shadow-sm"
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.4 }}
            aria-label="Primary navigation"
          >
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.name}
                  type="button"
                  className={
                    location.pathname === tab.path
                      ? 'tab active bottom-nav__item relative overflow-hidden text-[rgb(var(--mc-primary))]'
                      : 'tab bottom-nav__item relative overflow-hidden text-[rgb(var(--mc-muted))]'
                  }
                  onClick={() => navigate(tab.path)}
                  aria-label={tab.name}
                >
                  {location.pathname === tab.path && (
                    <div className="pointer-events-none absolute -bottom-0.5 left-1/2 h-0.5 w-6 -translate-x-1/2 rounded-full bg-[rgb(var(--mc-primary))]" />
                  )}
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
