import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': '/src',
    },
  },
  css: {
    preprocessorOptions: {
      scss: {
        // Silence Sass @import deprecation warnings
        // @ts-expect-error: non-standard option
        silenceDeprecations: ['all'],
      },
    },
  },
})
