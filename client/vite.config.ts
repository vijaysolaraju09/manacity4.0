import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const scssOptions: Record<string, unknown> = {
  silenceDeprecations: ['all'],
}

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': '/src',
    },
  },
  css: {
    preprocessorOptions: {
      scss: scssOptions,
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.ts',
  },
})
