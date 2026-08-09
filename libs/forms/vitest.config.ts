/// <reference types="vitest" />
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react()],
  cacheDir: '../../node_modules/.vitest/forms',
  root: __dirname,
  test: {
    name: '@letar/forms',
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['node_modules', 'dist'],
    coverage: {
      provider: 'v8',
      reportsDirectory: '../../coverage/libs/forms',
      reporter: ['text', 'json', 'html'],
    },
    clearMocks: true,
    restoreMocks: true,
  },
  resolve: {
    alias: {
      '@letar/forms-core/validators/ru': resolve(__dirname, '../forms-core/src/lib/validators/ru/index.ts'),
      '@letar/forms-core': resolve(__dirname, '../forms-core/src/index.ts'),
      '@letar/forms': resolve(__dirname, './src'),
    },
  },
})
