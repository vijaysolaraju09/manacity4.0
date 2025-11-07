import { Suspense, lazy } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from '@/auth/AuthProvider';
import { ProtectedRoute, PublicOnlyRoute } from '@/auth/routes';
import { Spinner } from '@/components/ui/Spinner';
import Home from '@/pages/Home/Home';
import Shops from '@/pages/Shops/Shops';
import ShopDetails from '@/pages/ShopDetails/ShopDetails';
import ServicesCatalog from '@/pages/Services/ServicesCatalog';
import ServiceDetails from '@/pages/Services/ServiceDetails';
import EventsHub from '@/pages/Events/EventsHub';
import EventDetails from '@/pages/Events/EventDetail';
import Profile from '@/pages/Profile/Profile';
import Cart from '@/pages/Cart/Cart';
import MyOrders from '@/pages/Orders/MyOrders';
import ReceivedOrders from '@/pages/Business/ReceivedOrders';

const Landing = lazy(() => import('@/pages/Landing/Landing'));
const Signup = lazy(() => import('@/pages/Auth/Signup'));
const Login = lazy(() => import('@/pages/Auth/Login'));
const ForgotPassword = lazy(() => import('@/pages/Auth/ForgotPassword'));

const FullscreenLoader = () => (
  <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
    <div className="flex items-center gap-3 rounded-xl bg-slate-900/80 px-6 py-4 shadow-xl">
      <Spinner ariaLabel="Loading" />
      <span className="font-semibold">Loading experience…</span>
    </div>
  </div>
);

const AppRouter = () => (
  <BrowserRouter>
    <AuthProvider>
      <Suspense fallback={<FullscreenLoader />}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/shops" element={<Shops />} />
          <Route path="/shops/:shopId" element={<ShopDetails />} />
          <Route path="/services" element={<ServicesCatalog />} />
          <Route path="/services/:serviceId" element={<ServiceDetails />} />
          <Route path="/events" element={<EventsHub />} />
          <Route path="/events/:eventId" element={<EventDetails />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/orders" element={<MyOrders />} />
          <Route path="/business/received-orders" element={<ReceivedOrders />} />

          <Route element={<PublicOnlyRoute />}>
            <Route path="/landing" element={<Landing />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/login" element={<Login />} />
            <Route path="/auth/signup" element={<Navigate to="/signup" replace />} />
            <Route path="/auth/login" element={<Navigate to="/login" replace />} />
            <Route path="/auth/forgot" element={<ForgotPassword />} />
          </Route>

          <Route element={<ProtectedRoute />}>
            <Route path="/home" element={<Navigate to="/" replace />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </AuthProvider>
  </BrowserRouter>
);

export default AppRouter;
