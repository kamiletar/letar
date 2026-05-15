/// <reference types="vitest" />
import { resolve } from 'path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  cacheDir: '../../node_modules/.vitest/animatrona',
  test: {
    name: 'animatrona',
    environment: 'node',
    globals: true,
    include: ['main/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['node_modules', 'dist', '.next', 'renderer'],
    coverage: {
      provider: 'v8',
      reportsDirectory: '../../coverage/apps/animatrona',
      reporter: ['text', 'json', 'html'],
    },
    clearMocks: true,
    restoreMocks: true,
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './main'),
    },
  },
})
