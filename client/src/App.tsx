import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import LandingPage from './pages/LandingPage/LandingPage';
import LoginPage from './pages/LoginPage/LoginPage';
import SignupPage from './pages/SignupPage/SignupPage';
import ProtectedRoute from './components/ProtectedRoute';
import './styles/main.scss';
// import OtpPage from "./pages/OTPPage/OTPPage";
import Profile from './pages/Profile/Profile';
import Home from './pages/Home/Home';
import Shops from './pages/Shops/Shops';
import ShopDetails from './pages/ShopDetails/ShopDetails';
import ProductDetails from './pages/ProductDetails/ProductDetails';
import EventDetails from './pages/EventDetails/EventDetails';
import VerifiedUserDetails from './pages/VerifiedUserDetails/VerifiedUserDetails';
import VerifiedUsers from './pages/VerifiedUsers/VerifiedUsers';
import SpecialShop from './pages/SpecialShop/SpecialShop';
import Settings from './pages/Settings/Settings';
import Cart from './pages/Cart/Cart';
import Events from './pages/Events/Events';
import VoiceOrder from './pages/VoiceOrder/VoiceOrder';
import ManageProducts from './pages/ManageProducts/ManageProducts';
import ReceivedOrders from './pages/ReceivedOrders/ReceivedOrders';
import MyOrders from './pages/MyOrders/MyOrders';
import TabLayout from './layouts/TabLayout';
import AdminLogin from './pages/AdminLogin/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';
import AdminPanel from './pages/AdminPanel';
import VerificationRequests from './pages/VerificationRequests';
import AdminProtectedRoute from './components/AdminProtectedRoute';
import { setUser } from './store/slices/userSlice';
import type { AppDispatch } from './store';
import UiPreview from './pages/UiPreview';

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
  }, [dispatch]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/admin-login" element={<AdminLogin />} />
        <Route path="/preview" element={<UiPreview />} />
        {/* <Route path="/verify-otp" element={<OtpPage />} /> */}
        <Route element={<AdminProtectedRoute />}>
          <Route path="/admin-dashboard" element={<AdminDashboard />} />
          <Route path="/admin-panel" element={<AdminPanel />} />
          <Route path="/admin/verification-requests" element={<VerificationRequests />} />
        </Route>
        <Route element={<ProtectedRoute />}>
          <Route element={<TabLayout />}>
            <Route path="/home" element={<Home />} />
            <Route path="/shops" element={<Shops />} />
            <Route path="/verified-users" element={<VerifiedUsers />} />
            <Route path="/events" element={<Events />} />
            <Route path="/special-shop" element={<SpecialShop />} />
            <Route path="/voice-order" element={<VoiceOrder />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/manage-products" element={<ManageProducts />} />
          <Route path="/orders/received" element={<ReceivedOrders />} />
          <Route path="/orders/my" element={<MyOrders />} />
        </Route>
          <Route path="/shops/:id" element={<ShopDetails />} />
          <Route path="/product/:id" element={<ProductDetails />} />
          <Route path="/events/:id" element={<EventDetails />} />
          <Route path="/verified-users/:id" element={<VerifiedUserDetails />} />
          <Route path="/cart" element={<Cart />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
