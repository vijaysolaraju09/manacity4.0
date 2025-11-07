import { Navigate, Route, Routes } from 'react-router-dom'
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

const AppRoutes = () => (
  <Routes>
    <Route element={<AppLayout />}>
      <Route index element={<HomeScreen />} />
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
      <Route path="*" element={<Navigate to="/" replace />} />
    </Route>
  </Routes>
)

export default AppRoutes
