import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { motion } from "framer-motion";
import { useSelector, useDispatch } from "react-redux";
import { Bell, CalendarDays, Gift, Home, Mic, Settings, ShoppingCart, Store, UserRound, Users } from "lucide-react";
import NavItem from "@/components/navigation/NavItem";
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
  const cartItemCount = useSelector(selectItemCount);
  const dispatch = useDispatch<AppDispatch>();

  useEffect(() => {
    if (notifStatus === 'idle') {
      dispatch(fetchNotifs({ page: 1 }));
    }
  }, [notifStatus, dispatch]);

  const tabs = [
    { name: "Home", icon: Home, path: paths.home() },
    { name: "Shops", icon: Store, path: paths.shops() },
    {
      name: "Verified",
      icon: Users,
      path: paths.verifiedUsers.list(),
    },
    { name: "Events", icon: CalendarDays, path: paths.events.list() },
  ];

  const orderTab = {
    name: "Order Now",
    icon: Mic,
    path: paths.voiceOrder(),
  };

  useEffect(() => {
    if (location.pathname === paths.root()) navigate(paths.home());
  }, [location.pathname, navigate]);

  const OrderTabIcon = orderTab.icon;

  return (
    <div className="tab-layout">
      <motion.header
        className="top-header"
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
          <NavItem to={paths.settings()} icon={Settings} label="Settings" ariaLabel="Settings" />
        </div>
      </motion.header>
      <main className="tab-content">
        <Outlet />
      </main>


      <motion.button
        type="button"
        className="special-shop-btn"
        onClick={() => navigate(paths.specialShop())}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        aria-label="Special shop"
      >
        <Gift className="h-5 w-5" aria-hidden="true" />
      </motion.button>

      <motion.nav
        className="tab-bar"
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4 }}
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
              <NavItem
                to={paths.settings()}
                icon={Settings}
                label="Settings"
                ariaLabel="Settings"
                variant="default"
              />
            </div>
          </nav>
        </div>
        {tabs.slice(0, 2).map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.name}
              type="button"
              className={location.pathname === tab.path ? 'active' : ''}
              onClick={() => navigate(tab.path)}
              aria-label={tab.name}
            >
              <Icon className="h-5 w-5" aria-hidden="true" />
              <span>{tab.name}</span>
            </button>
          );
        })}
        <button
          type="button"
          className={`order-now ${
            location.pathname === orderTab.path ? 'active' : ''
          }`}
          onClick={() => navigate(orderTab.path)}
          aria-label={orderTab.name}
        >
          <OrderTabIcon className="h-5 w-5" aria-hidden="true" />
          <span>{orderTab.name}</span>
        </button>
        {tabs.slice(2).map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.name}
              type="button"
              className={location.pathname === tab.path ? 'active' : ''}
              onClick={() => navigate(tab.path)}
              aria-label={tab.name}
            >
              <Icon className="h-5 w-5" aria-hidden="true" />
              <span>{tab.name}</span>
            </button>
          );
        })}
      </motion.nav>
    </div>
  );
};

export default TabLayout;
