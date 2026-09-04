/// <reference types="vitest" />
import { defineConfig } from 'vitest/config'

export default defineConfig({
  cacheDir: '../../node_modules/.vitest/slug-resolver',
  test: {
    name: '@letar/slug-resolver',
    environment: 'node',
    globals: true,
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['node_modules', 'dist'],
    coverage: {
      provider: 'v8',
      reportsDirectory: '../../coverage/libs/slug-resolver',
      reporter: ['text', 'json', 'html'],
    },
    clearMocks: true,
    restoreMocks: true,
  },
})
