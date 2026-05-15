/// <reference types="vitest" />
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react()],
  cacheDir: '../../node_modules/.vitest/premium-rosstil',
  root: __dirname,
  test: {
    name: 'premium-rosstil',
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.tsx'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['node_modules', 'dist', '.next', 'e2e'],
    coverage: {
      provider: 'v8',
      reportsDirectory: '../../coverage/apps/premium-rosstil',
      reporter: ['text', 'json', 'html'],
    },
    clearMocks: true,
    restoreMocks: true,
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@test-utils': resolve(__dirname, './src/test-utils'),
      // Библиотеки @letar/* — Vite не может резолвить без алиасов
      '@letar/email': resolve(__dirname, '../../libs/email/src/index.ts'),
      '@letar/auth/client': resolve(__dirname, '../../libs/auth/src/client/index.ts'),
      '@letar/auth/server': resolve(__dirname, '../../libs/auth/src/server/index.ts'),
      '@letar/auth': resolve(__dirname, '../../libs/auth/src/index.ts'),
      '@letar/format-utils': resolve(__dirname, '../../libs/format-utils/src/index.ts'),
    },
  },
})
