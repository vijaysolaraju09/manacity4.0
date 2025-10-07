import { describe, it, expect, vi } from 'vitest'
import type { HTMLAttributes } from 'react'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RouterProvider, createMemoryRouter } from 'react-router-dom'
import ThemeProvider from '@/theme/ThemeProvider'
import authReducer from '@/store/slices/authSlice'
import settingsReducer from '@/store/slices/settingsSlice'
import Settings from './Settings'
import { paths } from '@/routes/paths'

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: HTMLAttributes<HTMLDivElement>) => (
      <div {...props}>{children}</div>
    ),
  },
}))

vi.mock('@/api/auth', () => ({
  logoutApi: vi.fn().mockResolvedValue(undefined),
}))

describe('Settings logout flow', () => {
  it('redirects to the login page after logout', async () => {
    const store = configureStore({
      reducer: {
        auth: authReducer,
        settings: settingsReducer,
      },
    })

    const router = createMemoryRouter(
      [
        {
          path: paths.settings(),
          element: <Settings />,
        },
        {
          path: paths.auth.login(),
          element: <div>Login Page</div>,
        },
      ],
      { initialEntries: [paths.settings()] }
    )

    render(
      <Provider store={store}>
        <ThemeProvider>
          <RouterProvider router={router} />
        </ThemeProvider>
      </Provider>
    )

    await userEvent.click(screen.getByRole('button', { name: /logout/i }))

    await waitFor(() => {
      expect(router.state.location.pathname).toBe(paths.auth.login())
    })
  })
})
