import { Navigate, Route, Routes } from 'react-router-dom'
import AppLayout from '@/app/layouts/AppLayout'
import HomeScreen from '@/app/screens/HomeScreen'
import ShopsScreen from '@/app/screens/ShopsScreen'
import ServicesScreen from '@/app/screens/ServicesScreen'
import EventsScreen from '@/app/screens/EventsScreen'
import CartScreen from '@/app/screens/CartScreen'
import NotificationsScreen from '@/app/screens/NotificationsScreen'
import ProfileScreen from '@/app/screens/ProfileScreen'

const AppRoutes = () => (
  <Routes>
    <Route element={<AppLayout />}>
      <Route index element={<HomeScreen />} />
      <Route path="shops" element={<ShopsScreen />} />
      <Route path="services" element={<ServicesScreen />} />
      <Route path="events" element={<EventsScreen />} />
      <Route path="cart" element={<CartScreen />} />
      <Route path="notifications" element={<NotificationsScreen />} />
      <Route path="profile" element={<ProfileScreen />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Route>
  </Routes>
)

export default AppRoutes
