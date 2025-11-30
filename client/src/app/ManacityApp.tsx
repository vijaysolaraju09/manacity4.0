import { PropsWithChildren, useEffect } from 'react'
import { BrowserRouter } from 'react-router-dom'
import { Provider, useDispatch } from 'react-redux'
import ThemeStyles from '@/app/components/ThemeStyles'
import ThemeToggle from '@/app/components/ThemeToggle'
import HeroCarousel from '@/app/components/HeroCarousel'
import { Badge, Button, Card, Chip, IconButton, Input } from '@/app/components/primitives'
import AppLayout from '@/app/layouts/AppLayout'
import AppRoutes from '@/app/routes/AppRoutes'
import { Sidebar, Header, BottomTabs } from '@/app/components/navigation'
import useCountdown from '@/app/hooks/useCountdown'
import { store, type AppDispatch } from '@/store'
import { hydrateCart, readPersistedCart } from '@/store/slices/cartSlice'

const CartHydrator = ({ children }: PropsWithChildren) => {
  const dispatch = useDispatch<AppDispatch>()

  useEffect(() => {
    dispatch(hydrateCart(readPersistedCart()))
  }, [dispatch])

  return children
}

const ManacityApp = () => {
  useEffect(() => {
    const stored = window.localStorage.getItem('manacity-theme')
    document.documentElement.setAttribute('data-theme', stored === 'dark' ? 'dark' : 'light')
  }, [])

  return (
    <>
      <ThemeStyles />
      <Provider store={store}>
        <CartHydrator>
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </CartHydrator>
      </Provider>
    </>
  )
}

export {
  AppLayout,
  AppRoutes,
  Badge,
  BottomTabs,
  Button,
  Card,
  Chip,
  HeroCarousel,
  IconButton,
  Input,
  ManacityApp,
  Sidebar,
  ThemeStyles,
  ThemeToggle,
  Header,
  useCountdown,
}

export default ManacityApp
