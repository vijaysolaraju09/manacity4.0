import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { motion } from "framer-motion";
import { useSelector, useDispatch } from "react-redux";
import type { RootState, AppDispatch } from "../store";
import { fetchNotifs } from "@/store/notifs";
import { paths } from "@/routes/paths";
import {
  AiFillHome,
  AiOutlineShop,
  AiOutlineUsergroupAdd,
  AiOutlineGift,
  AiOutlineCalendar,
  AiOutlineUser,
  AiOutlineSetting,
  AiOutlineBell,
} from "react-icons/ai";
import { FaShoppingCart, FaMicrophone } from "react-icons/fa";
import "./TabLayout.scss";

const TabLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const cartItems = useSelector((state: RootState) => state.cart.items);
  const unread = useSelector((state: RootState) => state.notifs.unread);
  const notifStatus = useSelector((state: RootState) => state.notifs.status);
  const dispatch = useDispatch<AppDispatch>();

  useEffect(() => {
    if (notifStatus === 'idle') {
      dispatch(fetchNotifs({ page: 1 }));
    }
  }, [notifStatus, dispatch]);

  const tabs = [
    { name: "Home", icon: <AiFillHome />, path: paths.home() },
    { name: "Shops", icon: <AiOutlineShop />, path: paths.shops() },
    {
      name: "Verified",
      icon: <AiOutlineUsergroupAdd />,
      path: paths.verifiedUsers.list(),
    },
    { name: "Events", icon: <AiOutlineCalendar />, path: paths.events.list() },
  ];

  const orderTab = {
    name: "Order Now",
    icon: <FaMicrophone />,
    path: paths.voiceOrder(),
  };

  useEffect(() => {
    if (location.pathname === paths.root()) navigate(paths.home());
  }, [location.pathname, navigate]);

  return (
    <div className="tab-layout">
      <motion.header
        className="top-header"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="logo" onClick={() => navigate(paths.home())}>Manacity</h1>
        <div className="actions">
          {cartItems.length > 0 && (
            <button
              className="cart-btn"
              onClick={() => navigate(paths.cart())}
            >
              <FaShoppingCart />
              <span className="count">{cartItems.length}</span>
            </button>
          )}
          <button
            className="notif-btn"
            onClick={() => navigate(paths.notifications())}
          >
            <AiOutlineBell />
            {unread > 0 && <span className="count">{unread}</span>}
          </button>
          <button
            className="profile-btn"
            onClick={() => navigate(paths.profile())}
          >
            <AiOutlineUser />
          </button>
          <button
            className="settings-btn"
            onClick={() => navigate(paths.settings())}
          >
            <AiOutlineSetting />
          </button>
        </div>
      </motion.header>
      <main className="tab-content">
        <Outlet />
      </main>


      <motion.button
        className="special-shop-btn"
        onClick={() => navigate(paths.specialShop())}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <AiOutlineGift />
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
          {cartItems.length > 0 && (
            <button
              className="sidebar-cart"
              onClick={() => navigate(paths.cart())}
            >
              <FaShoppingCart />
              <span className="count">{cartItems.length}</span>
            </button>
          )}
          <button
            className="sidebar-notifications"
            onClick={() => navigate(paths.notifications())}
          >
            <AiOutlineBell />
            {unread > 0 && <span className="count">{unread}</span>}
          </button>
          <button
            className="sidebar-profile"
            onClick={() => navigate(paths.profile())}
          >
            <AiOutlineUser />
          </button>
          <button
            className="sidebar-settings"
            onClick={() => navigate(paths.settings())}
          >
            <AiOutlineSetting />
          </button>
        </div>
        {tabs.slice(0, 2).map((tab) => (
          <button
            key={tab.name}
            className={location.pathname === tab.path ? 'active' : ''}
            onClick={() => navigate(tab.path)}
          >
            {tab.icon}
            <span>{tab.name}</span>
          </button>
        ))}
        <button
          className={`order-now ${
            location.pathname === orderTab.path ? 'active' : ''
          }`}
          onClick={() => navigate(orderTab.path)}
        >
          {orderTab.icon}
          <span>{orderTab.name}</span>
        </button>
        {tabs.slice(2).map((tab) => (
          <button
            key={tab.name}
            className={location.pathname === tab.path ? 'active' : ''}
            onClick={() => navigate(tab.path)}
          >
            {tab.icon}
            <span>{tab.name}</span>
          </button>
        ))}
      </motion.nav>
    </div>
  );
};

export default TabLayout;
