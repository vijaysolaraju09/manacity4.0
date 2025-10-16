import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import 'slick-carousel/slick/slick.css'
import 'slick-carousel/slick/slick-theme.css'
import './styles/tailwind.css'
import './styles/main.scss'
import App from './App.tsx'
import { store } from './store'
import ThemeProvider from './theme/ThemeProvider'

document.body.classList.add('bg-background', 'text-slate-900', 'antialiased')
document.body.classList.add('transition-colors', 'duration-200', 'ease-out')

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Provider store={store}>
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </Provider>
  </StrictMode>,
)
