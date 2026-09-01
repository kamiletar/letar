/// <reference types="vitest" />
import { resolve } from 'path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  cacheDir: '../../node_modules/.vitest/auth-hub',
  root: import.meta.dirname,
  test: {
    name: 'auth-hub',
    environment: 'node',
    globals: true,
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['node_modules', 'dist', '.next', 'e2e'],
    coverage: {
      provider: 'v8',
      reportsDirectory: '../../coverage/apps/auth-hub',
      reporter: ['text', 'json', 'html'],
    },
    clearMocks: true,
    restoreMocks: true,
  },
  resolve: {
    alias: {
      '@': resolve(import.meta.dirname, './src'),
    },
  },
})
