import { Navigate, Route, Routes } from 'react-router-dom'
import { useSelector } from 'react-redux'
import AppLayout from '@/app/layouts/AppLayout'
import HomeScreen from '@/app/screens/HomeScreen'
import ShopsScreen from '@/app/screens/ShopsScreen'
import ShopDetailScreen from '@/app/screens/ShopDetailScreen'
import ServicesScreen from '@/app/screens/ServicesScreen'
import ServiceProvidersScreen from '@/app/screens/ServiceProvidersScreen'
import ServiceRequestScreen from '@/app/screens/ServiceRequestScreen'
import EventsScreen from '@/app/screens/EventsScreen'
import EventDetailScreen from '@/app/screens/EventDetailScreen'
import EventRegisterScreen from '@/app/screens/EventRegisterScreen'
import CartScreen from '@/app/screens/CartScreen'
import CheckoutScreen from '@/app/screens/CheckoutScreen'
import NotificationsScreen from '@/app/screens/NotificationsScreen'
import ProfileScreen from '@/app/screens/ProfileScreen'
import Landing from '@/pages/Landing/Landing'
import Login from '@/pages/auth/Login'
import Signup from '@/pages/auth/Signup'
import ForgotPassword from '@/pages/auth/ForgotPassword'
import ResetPassword from '@/pages/auth/ResetPassword/ResetPassword'
import type { RootState } from '@/store'

const AppRoutes = () => {
  const isAuthenticated = useSelector((state: RootState) => Boolean(state.auth.token))
  const fallbackTarget = isAuthenticated ? '/home' : '/login'

  return (
    <Routes>
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
            <Route path="services" element={<ServicesScreen />} />
            <Route path="services/request" element={<ServiceRequestScreen />} />
            <Route path="services/:id" element={<ServiceProvidersScreen />} />
            <Route path="events" element={<EventsScreen />} />
            <Route path="events/:id" element={<EventDetailScreen />} />
            <Route path="events/:id/register" element={<EventRegisterScreen />} />
            <Route path="cart" element={<CartScreen />} />
            <Route path="checkout" element={<CheckoutScreen />} />
            <Route path="notifications" element={<NotificationsScreen />} />
            <Route path="profile" element={<ProfileScreen />} />
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
