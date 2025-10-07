import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { useEffect, Suspense, lazy } from 'react';
import { useDispatch } from 'react-redux';
import ProtectedRoute from './components/ProtectedRoute';
import AdminProtectedRoute from './components/AdminProtectedRoute';
import TabLayout from './layouts/TabLayout';
import AdminLayout from './layouts/AdminLayout';
import './styles/main.scss';
import { setToken, fetchMe } from './store/slices/authSlice';
import { setAdminToken } from './store/slices/adminSlice';
import type { AppDispatch } from './store';
import Loader from './components/Loader';
import FloatingCart from './components/ui/FloatingCart';

const Landing = lazy(() => import('./pages/Landing/Landing'));
const Login = lazy(() => import('./pages/auth/Login/Login'));
const Signup = lazy(() => import('./pages/auth/Signup/Signup'));
const Profile = lazy(() => import('./pages/Profile/Profile'));
const Home = lazy(() => import('./pages/Home/Home'));
const Shops = lazy(() => import('./pages/Shops/Shops'));
const ShopDetails = lazy(() => import('./pages/ShopDetails/ShopDetails'));
const ProductDetails = lazy(() => import('./pages/ProductDetails/ProductDetails'));
const EventDetails = lazy(() => import('./pages/EventDetails/EventDetails'));
const VerifiedDetails = lazy(() => import('./pages/Verified/Details'));
const VerifiedList = lazy(() => import('./pages/Verified/List'));
const SpecialShop = lazy(() => import('./pages/SpecialShop/SpecialShop'));
const Settings = lazy(() => import('./pages/Settings/Settings'));
const Cart = lazy(() => import('./pages/Cart/Cart'));
const Events = lazy(() => import('./pages/Events/Events'));
const VoiceOrder = lazy(() => import('./pages/VoiceOrder/VoiceOrder'));
const OrderNow = lazy(() => import('./pages/OrderNow/OrderNow'));
const ManageProducts = lazy(() => import('./pages/ManageProducts/ManageProducts'));
const ReceivedOrders = lazy(() => import('./pages/Orders/ReceivedOrders'));
const MyOrders = lazy(() => import('./pages/Orders/MyOrders'));
const ServiceOrders = lazy(() => import('./pages/Orders/ServiceOrders'));
const OrderDetail = lazy(() => import('./pages/Orders/OrderDetail'));
const Notifications = lazy(() => import('./pages/Notifications/Notifications'));
const ProductsList = lazy(() => import('./pages/Products/ProductsList'));
const AdminLogin = lazy(() => import('./pages/AdminLogin/AdminLogin'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const AdminShops = lazy(() => import('./pages/AdminShops'));
const AdminProducts = lazy(() => import('./pages/AdminProducts'));
const AdminEvents = lazy(() => import('./pages/AdminEvents'));
const VerificationRequests = lazy(() => import('./pages/VerificationRequests'));
const BusinessRequests = lazy(() => import('./pages/BusinessRequests'));
const AdminUsers = lazy(() => import('./pages/AdminUsers'));
const AdminAnalytics = lazy(() => import('./pages/AdminAnalytics'));
const NotFound = lazy(() => import('./pages/NotFound/NotFound'));

const AppRoutes = () => {
  const location = useLocation();

  return (
    <>
      <Suspense fallback={<Loader />}>
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={<Landing key="landing" />} />
          <Route path="/login" element={<Login key="login" />} />
          <Route path="/signup" element={<Signup key="signup" />} />
          <Route path="/admin/login" element={<AdminLogin key="admin-login" />} />
          <Route
            path="/admin"
            element={<AdminProtectedRoute key="admin-protected" />}
          >
            <Route element={<AdminLayout key="admin-layout" />}>
              <Route index element={<AdminDashboard key="admin-dashboard" />} />
              <Route path="shops" element={<AdminShops key="admin-shops" />} />
              <Route
                path="products"
                element={<AdminProducts key="admin-products" />}
              />
              <Route path="events" element={<AdminEvents key="admin-events" />} />
              <Route path="users" element={<AdminUsers key="admin-users" />} />
              <Route
                path="analytics"
                element={<AdminAnalytics key="admin-analytics" />}
              />
              <Route path="requests">
                <Route
                  path="business"
                  element={<BusinessRequests key="admin-requests-business" />}
                />
                <Route
                  path="verification"
                  element={
                    <VerificationRequests key="admin-requests-verification" />
                  }
                />
              </Route>
            </Route>
          </Route>
          <Route element={<ProtectedRoute key="protected" />}>
            <Route element={<TabLayout key="tab-layout" />}>
              <Route path="/home" element={<Home key="home" />} />
              <Route path="/shops" element={<Shops key="shops" />} />
              <Route path="/products" element={<ProductsList key="products" />} />
              <Route
                path="/verified-users"
                element={<VerifiedList key="verified-list" />}
              />
              <Route path="/events" element={<Events key="events" />} />
              <Route
                path="/special-shop"
                element={<SpecialShop key="special-shop" />}
              />
              <Route
                path="/voice-order"
                element={<VoiceOrder key="voice-order" />}
              />
              <Route path="/order-now" element={<OrderNow key="order-now" />} />
              <Route
                path="/notifications"
                element={<Notifications key="notifications" />}
              />
              <Route path="/profile" element={<Profile key="profile" />} />
              <Route path="/settings" element={<Settings key="settings" />} />
              <Route
                path="/manage-products"
                element={<ManageProducts key="manage-products" />}
              />
              <Route
                path="/orders/received"
                element={<ReceivedOrders key="orders-received" />}
              />
              <Route path="/orders/my" element={<MyOrders key="orders-my" />} />
              <Route
                path="/orders/service"
                element={<ServiceOrders key="orders-service" />}
              />
            </Route>
            <Route path="/shops/:id" element={<ShopDetails key="shop-details" />} />
            <Route
              path="/product/:id"
              element={<ProductDetails key="product-details" />}
            />
            <Route
              path="/events/:id"
              element={<EventDetails key="event-details" />}
            />
            <Route
              path="/verified-users/:id"
              element={<VerifiedDetails key="verified-details" />}
            />
            <Route path="/orders/:id" element={<OrderDetail key="order-detail" />} />
            <Route path="/cart" element={<Cart key="cart" />} />
          </Route>
          <Route path="*" element={<NotFound key="not-found" />} />
        </Routes>
      </Suspense>
      <FloatingCart />
    </>
  );
};

function App() {
  const dispatch = useDispatch<AppDispatch>();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      dispatch(setToken(token));
      dispatch(fetchMe());
    }

    const adminToken = localStorage.getItem('manacity_admin_token');
    if (adminToken) {
      dispatch(setAdminToken(adminToken));
    }
  }, [dispatch]);

  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}

export { AppRoutes };
export default App;
