/// <reference types="vitest" />
import { defineConfig } from 'vitest/config'

export default defineConfig({
  cacheDir: '../../node_modules/.vitest/label-printer-desktop',
  test: {
    name: 'label-printer-desktop',
    environment: 'node',
    globals: true,
    include: ['main/**/*.{test,spec}.ts', 'shared/**/*.{test,spec}.ts'],
    exclude: ['node_modules', 'dist', 'app', 'renderer'],
    coverage: {
      provider: 'v8',
      reportsDirectory: '../../coverage/apps/label-printer-desktop',
      reporter: ['text', 'json', 'html'],
      include: ['main/**/*.ts', 'shared/**/*.ts'],
      exclude: ['**/*.spec.ts', '**/*.test.ts'],
    },
    clearMocks: true,
    restoreMocks: true,
  },
})
