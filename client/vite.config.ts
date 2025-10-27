import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import type { UserConfig as VitestUserConfig } from 'vitest/config'

const scssOptions: Record<string, unknown> = {
  silenceDeprecations: ['all'],
}

// https://vite.dev/config/
const testConfig: VitestUserConfig['test'] = {
  environment: 'jsdom',
  globals: true,
  setupFiles: './src/test/setup.ts',
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
  test: testConfig,
} satisfies VitestUserConfig)
