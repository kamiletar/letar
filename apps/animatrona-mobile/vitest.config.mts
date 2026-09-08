/// <reference types="vitest" />
import path from 'node:path'

import { defineConfig } from 'vitest/config'

export default defineConfig({
  cacheDir: '../../node_modules/.vitest/animatrona-mobile',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  test: {
    name: '@letar/animatrona-mobile',
    environment: 'node',
    globals: true,
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['node_modules', 'android'],
    coverage: {
      provider: 'v8',
      reportsDirectory: '../../coverage/apps/animatrona-mobile',
      reporter: ['text', 'json', 'html'],
    },
    clearMocks: true,
    restoreMocks: true,
  },
})
