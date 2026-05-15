/// <reference types="vitest" />
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react({ jsxRuntime: 'automatic' })],
  cacheDir: '../../node_modules/.vitest/imot',
  root: __dirname,
  test: {
    name: 'imot',
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.tsx'],
    include: ['src/**/*.{test,spec}.{ts,tsx}', 'specs/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['node_modules', 'dist', '.next', 'e2e'],
    coverage: {
      provider: 'v8',
      reportsDirectory: '../../coverage/apps/imot',
      reporter: ['text', 'json', 'html'],
    },
    clearMocks: true,
    restoreMocks: true,
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@letar/validation-utils': resolve(__dirname, '../../libs/validation-utils/src/index.ts'),
      '@letar/auth': resolve(__dirname, '../../libs/auth/src/index.ts'),
      '@letar/auth/client': resolve(__dirname, '../../libs/auth/src/client/index.ts'),
      '@letar/auth/server': resolve(__dirname, '../../libs/auth/src/server/index.ts'),
      '@letar/query-provider': resolve(__dirname, '../../libs/query-provider/src/index.ts'),
      '@letar/analytics': resolve(__dirname, '../../libs/analytics/src/index.ts'),
      '@letar/forms': resolve(__dirname, '../../libs/forms/src/index.ts'),
      '@letar/ui': resolve(__dirname, '../../libs/ui/src/index.ts'),
      '@letar/email': resolve(__dirname, '../../libs/email/src/index.ts'),
    },
  },
})
