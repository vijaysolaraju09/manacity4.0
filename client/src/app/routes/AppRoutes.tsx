import { Navigate, Route, Routes } from 'react-router-dom'
import { useSelector } from 'react-redux'
import AppLayout from '@/app/layouts/AppLayout'
import Home from '@/pages/AppHome/Home'
import Shops from '@/pages/AppShops/Shops'
import ShopDetails from '@/pages/AppShops/ShopDetails'
import ProductDetails from '@/pages/products/ProductDetails'
import Services from '@/pages/AppServices/ServicesCatalog'
import ServiceDetails from '@/pages/AppServices/ServiceDetails'
import Events from '@/pages/AppEvents/EventsHub'
import EventDetails from '@/pages/AppEvents/EventDetails'
import EventRegisterScreen from '@/app/screens/EventRegisterScreen'
import MyOrders from '@/pages/AppOrders/MyOrders'
import ReceivedOrders from '@/pages/business/ReceivedOrders'
import Profile from '@/pages/AppProfile/Profile'
import CartScreen from '@/app/screens/CartScreen'
import CheckoutScreen from '@/app/screens/CheckoutScreen'
import NotificationsScreen from '@/app/screens/NotificationsScreen'
import ServiceRequestScreen from '@/app/screens/ServiceRequestScreen'
import ServiceProvidersScreen from '@/app/screens/ServiceProvidersScreen'
import Landing from '@/pages/Landing/Landing'
import Login from '@/pages/auth/Login'
import Signup from '@/pages/auth/Signup'
import ForgotPassword from '@/pages/auth/ForgotPassword'
import ResetPassword from '@/pages/auth/ResetPassword/ResetPassword'
import AdminProtectedRoute from '@/components/AdminProtectedRoute'
import AdminLayout from '@/layouts/AdminLayout'
import AdminLogin from '@/pages/AdminLogin/AdminLogin'
import AdminDashboard from '@/pages/AdminDashboard'
import AdminShops from '@/pages/AdminShops'
import AdminProducts from '@/pages/AdminProducts'
import AdminBannersPage from '@/pages/Admin/Banners/AdminBanners'
import AdminEventsRoot from '@/pages/Admin/Events/AdminEventsRoot'
import AdminEventsListPage from '@/pages/Admin/Events/AdminEventsList'
import AdminEventManageLayout from '@/pages/Admin/Events/AdminEventLayout'
import AdminEventEditorPage from '@/pages/Admin/Events/AdminEventEditor'
import AdminEventRegistrationsPage from '@/pages/Admin/Events/AdminRegistrations'
import AdminEventLeaderboardPage from '@/pages/Admin/Events/AdminLeaderboard'
import AdminFormBuilderPage from '@/pages/admin/FormBuilder/FormBuilder'
import AdminEventFormAttachPage from '@/pages/admin/EventFormAttach/EventFormAttach'
import AdminServicesPage from '@/pages/AdminServices'
import AdminServiceRequestsPage from '@/pages/AdminServiceRequests'
import BusinessRequests from '@/pages/BusinessRequests'
import VerificationRequests from '@/pages/VerificationRequests'
import AdminUsers from '@/pages/AdminUsers'
import AdminAnalytics from '@/pages/AdminAnalytics'
import type { RootState } from '@/store'

const AppRoutes = () => {
  const isAuthenticated = useSelector((state: RootState) => Boolean(state.auth.token))
  const fallbackTarget = isAuthenticated ? '/' : '/login'

  return (
    <Routes>
      <Route path="/admin/login" element={<AdminLogin />} />

      <Route element={<AdminProtectedRoute />}>
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminDashboard />} />
          <Route path="announcements" element={<AdminBannersPage />} />
          <Route path="shops" element={<AdminShops />} />
          <Route path="products" element={<AdminProducts />} />
          <Route path="form-templates" element={<AdminFormBuilderPage />} />
          <Route path="events" element={<AdminEventsRoot />}>
            <Route index element={<AdminEventsListPage />} />
            <Route path="new" element={<AdminEventEditorPage mode="create" />} />
            <Route path=":eventId" element={<AdminEventManageLayout />}>
              <Route index element={<AdminEventEditorPage />} />
              <Route path="registrations" element={<AdminEventRegistrationsPage />} />
              <Route path="leaderboard" element={<AdminEventLeaderboardPage />} />
              <Route path="form" element={<AdminEventFormAttachPage />} />
            </Route>
          </Route>
          <Route path="users" element={<AdminUsers />} />
          <Route path="analytics" element={<AdminAnalytics />} />
          <Route path="services" element={<AdminServicesPage />} />
          <Route path="service-requests" element={<AdminServiceRequestsPage />} />
          <Route path="requests/business" element={<BusinessRequests />} />
          <Route path="requests/verification" element={<VerificationRequests />} />
        </Route>
      </Route>

      {!isAuthenticated && (
        <>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/auth/login" element={<Navigate to="/login" replace />} />
          <Route path="/auth/signup" element={<Navigate to="/signup" replace />} />
          <Route path="/forgot" element={<Navigate to="/auth/forgot" replace />} />
          <Route path="/auth/forgot" element={<ForgotPassword />} />
          <Route path="/reset" element={<ResetPassword />} />
        </>
      )}

      {isAuthenticated && (
        <>
          <Route path="/" element={<AppLayout />}>
            <Route index element={<Home />} />
            <Route path="shops" element={<Shops />} />
            <Route path="shops/:shopId" element={<ShopDetails />} />
            <Route path="products/:productId" element={<ProductDetails />} />
            <Route path="services" element={<Services />} />
            <Route path="services/request" element={<ServiceRequestScreen />} />
            <Route path="services/:serviceId" element={<ServiceDetails />} />
            <Route path="services/:serviceId/providers" element={<ServiceProvidersScreen />} />
            <Route path="events" element={<Events />} />
            <Route path="events/:eventId" element={<EventDetails />} />
            <Route path="events/:eventId/register" element={<EventRegisterScreen />} />
            <Route path="cart" element={<CartScreen />} />
            <Route path="checkout" element={<CheckoutScreen />} />
            <Route path="notifications" element={<NotificationsScreen />} />
            <Route path="orders" element={<MyOrders />} />
            <Route path="orders/mine" element={<Navigate to="/orders" replace />} />
            <Route path="business/received-orders" element={<ReceivedOrders />} />
            <Route path="orders/received" element={<Navigate to="/business/received-orders" replace />} />
            <Route path="profile" element={<Profile />} />
          </Route>
          <Route path="/login" element={<Navigate to="/" replace />} />
          <Route path="/signup" element={<Navigate to="/" replace />} />
          <Route path="/auth/login" element={<Navigate to="/" replace />} />
          <Route path="/auth/signup" element={<Navigate to="/" replace />} />
          <Route path="/auth/forgot" element={<Navigate to="/" replace />} />
          <Route path="/reset" element={<Navigate to="/" replace />} />
        </>
      )}

      <Route path="*" element={<Navigate to={fallbackTarget} replace />} />
    </Routes>
  )
}

export default AppRoutes
