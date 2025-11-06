import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import 'slick-carousel/slick/slick.css'
import 'slick-carousel/slick/slick-theme.css'
import './styles/tailwind.css'
import './styles/main.css'
import './styles/main.scss'
import './styles/globals.scss'
import './styles/theme.css'
import './styles/dark-pack.css'
import './styles/unified-theme.css'
import '@/styles/sidebar.scss'
import App from './App.tsx'
import { store } from './store'
import ThemeProvider from './theme/ThemeProvider'
import { initTheme } from './theme/theme'

initTheme()

document.body.classList.remove('bg-slate-50', 'text-slate-900')
document.body.classList.add('antialiased', 'transition-colors', 'duration-200', 'ease-out')

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Provider store={store}>
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </Provider>
  </StrictMode>,
)
