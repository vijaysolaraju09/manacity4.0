import { Suspense, lazy } from 'react';
import { Routes, Route, Outlet } from 'react-router-dom';
import ProtectedRoute from '@/components/ProtectedRoute';
import AdminProtectedRoute from '@/components/AdminProtectedRoute';
import TabLayout from '@/layouts/TabLayout';
import AdminLayout from '@/layouts/AdminLayout';
import Loader from '@/components/Loader';
import ScrollToTop from './ScrollToTop';

const Landing = lazy(() => import('@/pages/Landing/Landing'));
const Login = lazy(() => import('@/pages/auth/Login/Login'));
const Signup = lazy(() => import('@/pages/auth/Signup/Signup'));
const Profile = lazy(() => import('@/pages/Profile/Profile'));
const Home = lazy(() => import('@/pages/Home/Home'));
const Shops = lazy(() => import('@/pages/Shops/Shops'));
const ShopDetails = lazy(() => import('@/pages/ShopDetails/ShopDetails'));
const ProductDetails = lazy(() => import('@/pages/ProductDetails/ProductDetails'));
const EventDetailPage = lazy(() => import('@/pages/Events/EventDetail'));
const EventRegisterPage = lazy(() => import('@/pages/Events/RegisterEvent'));
const ServicesHub = lazy(() => import('@/pages/Services/ServicesHub'));
const ServicesCatalog = lazy(() => import('@/pages/Services/ServicesCatalog'));
const PublicRequests = lazy(() => import('@/pages/Services/PublicRequests'));
const MyRequests = lazy(() => import('@/pages/Services/MyRequests'));
const ServiceProviders = lazy(() => import('@/pages/Services/ServiceProviders'));
const ServiceRequestFormPage = lazy(() => import('@/pages/Services/ServiceRequestForm'));
const LegacyVerified = lazy(() => import('@/pages/Services/LegacyVerified'));
const ProvidersPage = lazy(() => import('@/pages/Providers/ProvidersPage'));
const VerifiedDetails = lazy(() => import('@/pages/Verified/Details'));
const VerifiedList = lazy(() => import('@/pages/Verified/List'));
const SpecialShop = lazy(() => import('@/pages/SpecialShop/SpecialShop'));
const Settings = lazy(() => import('@/pages/Settings/Settings'));
const Cart = lazy(() => import('@/pages/CartPage'));
const Checkout = lazy(() => import('@/pages/Checkout/Checkout'));
const Events = lazy(() => import('@/pages/Events/Events'));
const VoiceOrder = lazy(() => import('@/pages/VoiceOrder/VoiceOrder'));
const OrderNow = lazy(() => import('@/pages/OrderNow/OrderNow'));
const ManageProducts = lazy(() => import('@/pages/ManageProducts/ManageProducts'));
const ReceivedOrders = lazy(() => import('@/pages/Orders/ReceivedOrders'));
const MyOrders = lazy(() => import('@/pages/Orders/MyOrders'));
const ServiceOrders = lazy(() => import('@/pages/Orders/ServiceOrders'));
const OrderDetail = lazy(() => import('@/pages/Orders/OrderDetail'));
const Notifications = lazy(() => import('@/pages/Notifications/Notifications'));
const ProductsList = lazy(() => import('@/pages/Products/ProductsList'));
const AdminLogin = lazy(() => import('@/pages/AdminLogin/AdminLogin'));
const AdminDashboard = lazy(() => import('@/pages/AdminDashboard'));
const AdminShops = lazy(() => import('@/pages/AdminShops'));
const AdminProducts = lazy(() => import('@/pages/AdminProducts'));
const AdminEventsRoot = lazy(() => import('@/pages/Admin/Events/AdminEventsRoot'));
const AdminEventsListPage = lazy(() => import('@/pages/Admin/Events/AdminEventsList'));
const AdminEventManageLayout = lazy(() => import('@/pages/Admin/Events/AdminEventLayout'));
const AdminEventEditorPage = lazy(() => import('@/pages/Admin/Events/AdminEventEditor'));
const AdminEventRegistrationsPage = lazy(() => import('@/pages/Admin/Events/AdminRegistrations'));
const AdminEventLeaderboardPage = lazy(() => import('@/pages/Admin/Events/AdminLeaderboard'));
const AdminServicesPage = lazy(() => import('@/pages/AdminServices'));
const AdminServiceRequestsPage = lazy(() => import('@/pages/AdminServiceRequests'));
const VerificationRequests = lazy(() => import('@/pages/VerificationRequests'));
const BusinessRequests = lazy(() => import('@/pages/BusinessRequests'));
const AdminUsers = lazy(() => import('@/pages/AdminUsers'));
const AdminAnalytics = lazy(() => import('@/pages/AdminAnalytics'));
const AdminFormBuilderPage = lazy(() => import('@/pages/admin/FormBuilder/FormBuilder'));
const AdminEventFormAttachPage = lazy(() => import('@/pages/admin/EventFormAttach/EventFormAttach'));
const NotFound = lazy(() => import('@/pages/NotFound/NotFound'));

const SuspendedOutlet = () => (
  <Suspense fallback={<Loader />}>
    <Outlet />
  </Suspense>
);

const RootLayout = () => (
  <>
    <ScrollToTop />
    <SuspendedOutlet />
  </>
);

const AppRoutes = () => (
  <Routes>
    <Route key="root" element={<RootLayout />}>
      <Route key="landing" path="/" element={<Landing />} />
      <Route key="login" path="/login" element={<Login />} />
      <Route key="signup" path="/signup" element={<Signup />} />
      <Route key="admin-login" path="/admin/login" element={<AdminLogin />} />

      <Route key="admin-guard" element={<AdminProtectedRoute />}>
        <Route key="admin" path="/admin" element={<AdminLayout />}>
          <Route key="admin-dashboard" index element={<AdminDashboard />} />
          <Route key="admin-shops" path="shops" element={<AdminShops />} />
          <Route key="admin-products" path="products" element={<AdminProducts />} />
          <Route key="admin-form-templates" path="form-templates" element={<AdminFormBuilderPage />} />
          <Route key="admin-events" path="events" element={<AdminEventsRoot />}>
            <Route index element={<AdminEventsListPage />} />
            <Route path="new" element={<AdminEventEditorPage mode="create" />} />
            <Route path=":eventId" element={<AdminEventManageLayout />}>
              <Route index element={<AdminEventEditorPage />} />
              <Route path="registrations" element={<AdminEventRegistrationsPage />} />
              <Route path="leaderboard" element={<AdminEventLeaderboardPage />} />
              <Route path="form" element={<AdminEventFormAttachPage />} />
            </Route>
          </Route>
          <Route key="admin-users" path="users" element={<AdminUsers />} />
          <Route key="admin-analytics" path="analytics" element={<AdminAnalytics />} />
          <Route key="admin-services" path="services" element={<AdminServicesPage />} />
          <Route key="admin-service-requests" path="service-requests" element={<AdminServiceRequestsPage />} />
          <Route key="admin-requests" path="requests" element={<SuspendedOutlet />}>
            <Route
              key="admin-requests-business"
              path="business"
              element={<BusinessRequests />}
            />
            <Route
              key="admin-requests-verification"
              path="verification"
              element={<VerificationRequests />}
            />
          </Route>
        </Route>
      </Route>

      <Route key="app-guard" element={<ProtectedRoute />}>
        <Route key="tab-layout" element={<TabLayout />}>
          <Route key="home" path="home" element={<Home />} />
          <Route key="shops" path="shops" element={<Shops />} />
          <Route key="products" path="products" element={<ProductsList />} />
          <Route key="services" path="services" element={<ServicesHub />}>
            <Route index element={<ServicesCatalog />} />
            <Route path="requests" element={<PublicRequests />} />
            <Route path="requests/mine" element={<MyRequests />} />
          </Route>
          <Route key="service-request" path="services/request" element={<ServiceRequestFormPage />} />
          <Route key="providers" path="providers" element={<ProvidersPage />} />
          <Route key="verified-list" path="verified-users" element={<VerifiedList />} />
          <Route key="legacy-verified" path="verified" element={<LegacyVerified />} />
          <Route key="events" path="events" element={<Events />} />
          <Route key="special-shop" path="special-shop" element={<SpecialShop />} />
          <Route key="voice-order" path="voice-order" element={<VoiceOrder />} />
          <Route key="order-now" path="order-now" element={<OrderNow />} />
          <Route key="notifications" path="notifications" element={<Notifications />} />
          <Route key="profile" path="profile" element={<Profile />} />
          <Route key="settings" path="settings" element={<Settings />} />
          <Route key="manage-products" path="manage-products" element={<ManageProducts />} />
          <Route key="orders-received" path="orders/received" element={<ReceivedOrders />} />
          <Route key="orders-mine" path="orders/mine" element={<MyOrders />} />
          <Route key="orders-service" path="orders/service" element={<ServiceOrders />} />
        </Route>
        <Route key="shop-details" path="shops/:id" element={<ShopDetails />} />
        <Route key="product-details" path="product/:id" element={<ProductDetails />} />
        <Route key="event-details" path="events/:id" element={<EventDetailPage />} />
        <Route key="event-register" path="events/:id/register" element={<EventRegisterPage />} />
        <Route key="service-providers" path="services/:id" element={<ServiceProviders />} />
        <Route
          key="verified-details"
          path="verified-users/:id"
          element={<VerifiedDetails />}
        />
        <Route key="provider-details" path="providers/:id" element={<VerifiedDetails />} />
        <Route key="order-detail" path="orders/:id" element={<OrderDetail />} />
        <Route key="cart" path="cart" element={<Cart />} />
        <Route key="checkout" path="checkout" element={<Checkout />} />
      </Route>

      <Route key="not-found" path="*" element={<NotFound />} />
    </Route>
  </Routes>
);

export { AppRoutes };
export default AppRoutes;
