import { Navigate, Route, Routes } from 'react-router-dom'
import { useSelector } from 'react-redux'
import AppLayout from '@/layouts/AppLayout'
import HomeScreen from '@/pages/HomeScreen'
import ShopsScreen from '@/pages/ShopsScreen'
import ShopDetailScreen from '@/pages/ShopDetailScreen'
import ServicesScreen from '@/pages/ServicesScreen'
import ServiceProvidersScreen from '@/pages/ServiceProvidersScreen'
import ServiceRequestScreen from '@/pages/ServiceRequestScreen'
import EventsScreen from '@/pages/EventsScreen'
import EventDetailScreen from '@/pages/EventDetailScreen'
import EventRegisterScreen from '@/pages/EventRegisterScreen'
import CartScreen from '@/pages/CartScreen'
import CheckoutScreen from '@/pages/CheckoutScreen'
import NotificationsScreen from '@/pages/NotificationsScreen'
import ProfileScreen from '@/pages/ProfileScreen'
import ProductDetails from '@/pages/ProductDetails/ProductDetails'
import MyOrders from '@/pages/Orders/MyOrders'
import OrderDetail from '@/pages/Orders/OrderDetail'
import HistoryPage from '@/pages/History/History'
import ServiceRequestListPage from '@/pages/ServiceRequests/MyRequests'
import ServiceRequestDetailPage from '@/pages/ServiceRequests/ServiceRequestDetail'
import Landing from '@/pages/Landing/Landing'
import Login from '@/pages/auth/Login'
import Signup from '@/pages/auth/Signup'
import ForgotPassword from '@/pages/auth/ForgotPassword'
import ResetPassword from '@/pages/auth/ResetPassword/ResetPassword'
import AdminProtectedRoute from '@/components/AdminProtectedRoute'
import RoleGuardRoute from '@/components/RoleGuardRoute'
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
import AnnouncementDetail from '@/pages/Announcements/AnnouncementDetail'
import ManageProducts from '@/pages/ManageProducts/ManageProducts'
import ReceivedOrders from '@/pages/Orders/ReceivedOrders'
import type { RootState } from '@/store'

const AppRoutes = () => {
  const isAuthenticated = useSelector((state: RootState) => Boolean(state.auth.token))
  const fallbackTarget = isAuthenticated ? '/home' : '/login'

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
            <Route index element={<Navigate to="/home" replace />} />
            <Route path="home" element={<HomeScreen />} />
            <Route path="shops" element={<ShopsScreen />} />
            <Route path="shops/:id" element={<ShopDetailScreen />} />
            <Route path="product/:id" element={<ProductDetails />} />
            <Route path="services" element={<ServicesScreen />} />
            <Route element={<RoleGuardRoute allowedRoles={["customer", "business"]} />}>
              <Route path="services/request" element={<ServiceRequestScreen />} />
              <Route path="requests" element={<ServiceRequestListPage />} />
              <Route path="requests/:requestId" element={<ServiceRequestDetailPage />} />
              <Route path="cart" element={<CartScreen />} />
              <Route path="checkout" element={<CheckoutScreen />} />
              <Route path="orders/mine" element={<MyOrders />} />
            </Route>
            <Route path="services/:id" element={<ServiceProvidersScreen />} />
            <Route path="events" element={<EventsScreen />} />
            <Route path="events/:id" element={<EventDetailScreen />} />
            <Route path="events/:id/register" element={<EventRegisterScreen />} />
            <Route path="announcements/:id" element={<AnnouncementDetail />} />
            <Route path="notifications" element={<NotificationsScreen />} />
            <Route path="profile" element={<ProfileScreen />} />
            <Route path="manage-products" element={<ManageProducts />} />
            <Route path="orders/:id" element={<OrderDetail />} />
            <Route path="orders/received" element={<ReceivedOrders />} />
            <Route path="history" element={<HistoryPage />} />
          </Route>
          <Route path="/login" element={<Navigate to="/home" replace />} />
          <Route path="/signup" element={<Navigate to="/home" replace />} />
          <Route path="/auth/login" element={<Navigate to="/home" replace />} />
          <Route path="/auth/signup" element={<Navigate to="/home" replace />} />
          <Route path="/auth/forgot" element={<Navigate to="/home" replace />} />
          <Route path="/reset" element={<Navigate to="/home" replace />} />
        </>
      )}

      <Route path="*" element={<Navigate to={fallbackTarget} replace />} />
    </Routes>
  )
}

export default AppRoutes
