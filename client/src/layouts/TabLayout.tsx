import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { motion } from "framer-motion";
import { useSelector, useDispatch } from "react-redux";
import { Bell, CalendarDays, Gift, Home, Mic, Settings, ShoppingCart, Store, UserRound, Users } from "lucide-react";
import MiniCart from "@/components/cart/MiniCart";
import SidebarItem from "@/components/navigation/SidebarItem";
import type { RootState, AppDispatch } from "../store";
import { fetchNotifs } from "@/store/notifs";
import { selectMyPendingOrdersCount, fetchMyOrders } from "@/store/orders";
import { paths } from "@/routes/paths";
import "./TabLayout.scss";

const TabLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const unread = useSelector((state: RootState) => state.notifs.unread);
  const notifStatus = useSelector((state: RootState) => state.notifs.status);
  const ordersStatus = useSelector((state: RootState) => state.orders.mine.status);
  const pendingOrders = useSelector(selectMyPendingOrdersCount);
  const dispatch = useDispatch<AppDispatch>();

  useEffect(() => {
    if (notifStatus === 'idle') {
      dispatch(fetchNotifs({ page: 1 }));
    }
  }, [notifStatus, dispatch]);

  useEffect(() => {
    if (ordersStatus === "idle") {
      dispatch(fetchMyOrders());
    }
  }, [dispatch, ordersStatus]);

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
          <MiniCart />
          <button
            type="button"
            className="notif-btn action-button"
            onClick={() => navigate(paths.notifications())}
            aria-label="Notifications"
          >
            <Bell className="h-5 w-5" aria-hidden="true" />
            {unread > 0 && <span className="count">{unread}</span>}
          </button>
          <button
            type="button"
            className="profile-btn action-button"
            onClick={() => navigate(paths.profile())}
            aria-label="Profile"
          >
            <UserRound className="h-5 w-5" aria-hidden="true" />
          </button>
          <button
            type="button"
            className="settings-btn action-button"
            onClick={() => navigate(paths.settings())}
            aria-label="Settings"
          >
            <Settings className="h-5 w-5" aria-hidden="true" />
          </button>
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
          <nav className="flex w-full flex-col gap-1.5">
            <SidebarItem
              to={paths.orders.mine()}
              icon={ShoppingCart}
              label="My orders"
              badge={pendingOrders > 0 ? (pendingOrders > 99 ? '99+' : pendingOrders) : undefined}
              className="orders-nav-button"
            />
            <SidebarItem
              to={paths.notifications()}
              icon={Bell}
              label="Notifications"
              badge={unread > 0 ? (unread > 99 ? '99+' : unread) : undefined}
            />
            <SidebarItem to={paths.profile()} icon={UserRound} label="Profile" />
            <SidebarItem to={paths.settings()} icon={Settings} label="Settings" />
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
