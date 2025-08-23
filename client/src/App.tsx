import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useEffect, Suspense, lazy } from 'react';
import { useDispatch } from 'react-redux';
import ProtectedRoute from './components/ProtectedRoute';
import AdminProtectedRoute from './components/AdminProtectedRoute';
import TabLayout from './layouts/TabLayout';
import AdminLayout from './layouts/AdminLayout';
import './styles/main.scss';
import { setUser } from './store/slices/userSlice';
import { setAdminToken } from './store/slices/adminSlice';
import type { AppDispatch } from './store';
import Loader from './components/Loader';

const Landing = lazy(() => import('./pages/Landing/Landing'));
const Login = lazy(() => import('./pages/auth/Login/Login'));
const Signup = lazy(() => import('./pages/auth/Signup/Signup'));
const OTP = lazy(() => import('./pages/auth/OTP/OTP'));
const ForgotPassword = lazy(() => import('./pages/auth/ForgotPassword/ForgotPassword'));
const SetNewPassword = lazy(() => import('./pages/auth/SetNewPassword/SetNewPassword'));
const PhoneAuth = lazy(() => import('./pages/auth/PhoneAuth/PhoneAuth'));
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
const OrderDetail = lazy(() => import('./pages/Orders/OrderDetail'));
const Notifications = lazy(() => import('./pages/Notifications/Notifications'));
const AdminLogin = lazy(() => import('./pages/AdminLogin/AdminLogin'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const AdminShops = lazy(() => import('./pages/AdminShops'));
const AdminProducts = lazy(() => import('./pages/AdminProducts'));
const AdminEvents = lazy(() => import('./pages/AdminEvents'));
const VerificationRequests = lazy(() => import('./pages/VerificationRequests'));
const BusinessRequests = lazy(() => import('./pages/BusinessRequests'));
const AdminUsers = lazy(() => import('./pages/AdminUsers'));
const AdminAnalytics = lazy(() => import('./pages/AdminAnalytics'));
const UiPreview = lazy(() => import('./pages/UiPreview'));

function App() {
  const dispatch = useDispatch<AppDispatch>();

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (stored) {
      try {
        dispatch(setUser(JSON.parse(stored)));
      } catch {
        // ignore parsing errors
      }
    }

    const adminToken = localStorage.getItem('manacity_admin_token');
    if (adminToken) {
      dispatch(setAdminToken(adminToken));
    }
  }, [dispatch]);

  return (
    <BrowserRouter>
      <Suspense fallback={<Loader />}>
        <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/otp" element={<OTP />} />
        <Route path="/phone-auth" element={<PhoneAuth />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/set-new-password" element={<SetNewPassword />} />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/preview" element={<UiPreview />} />
        <Route path="/admin" element={<AdminProtectedRoute />}>
          <Route element={<AdminLayout />}>
            <Route index element={<AdminDashboard />} />
            <Route path="shops" element={<AdminShops />} />
            <Route path="products" element={<AdminProducts />} />
            <Route path="events" element={<AdminEvents />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="analytics" element={<AdminAnalytics />} />
            <Route path="requests">
              <Route path="business" element={<BusinessRequests />} />
              <Route path="verification" element={<VerificationRequests />} />
            </Route>
          </Route>
        </Route>
        <Route element={<ProtectedRoute />}>
          <Route element={<TabLayout />}>
            <Route path="/home" element={<Home />} />
            <Route path="/shops" element={<Shops />} />
            <Route path="/verified-users" element={<VerifiedList />} />
            <Route path="/events" element={<Events />} />
            <Route path="/special-shop" element={<SpecialShop />} />
            <Route path="/voice-order" element={<VoiceOrder />} />
            <Route path="/order-now" element={<OrderNow />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/manage-products" element={<ManageProducts />} />
            <Route path="/orders/received" element={<ReceivedOrders />} />
            <Route path="/orders/my" element={<MyOrders />} />
          </Route>
          <Route path="/shops/:id" element={<ShopDetails />} />
          <Route path="/product/:id" element={<ProductDetails />} />
          <Route path="/events/:id" element={<EventDetails />} />
          <Route path="/verified-users/:id" element={<VerifiedDetails />} />
          <Route path="/orders/:id" element={<OrderDetail />} />
          <Route path="/cart" element={<Cart />} />
        </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
