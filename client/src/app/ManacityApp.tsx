import { useEffect } from 'react'
import { BrowserRouter } from 'react-router-dom'
import ThemeStyles from '@/app/components/ThemeStyles'
import ThemeToggle from '@/app/components/ThemeToggle'
import HeroCarousel from '@/app/components/HeroCarousel'
import { Badge, Button, Card, Chip, IconButton, Input } from '@/app/components/primitives'
import AppLayout from '@/app/layouts/AppLayout'
import AppRoutes from '@/app/routes/AppRoutes'
import { Sidebar, Header, BottomTabs } from '@/app/components/navigation'
import useCountdown from '@/app/hooks/useCountdown'

const ManacityApp = () => {
  useEffect(() => {
    const stored = window.localStorage.getItem('manacity-theme')
    document.documentElement.setAttribute('data-theme', stored === 'dark' ? 'dark' : 'light')
  }, [])

  return (
    <>
      <ThemeStyles />
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
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
