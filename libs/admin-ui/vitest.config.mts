/// <reference types="vitest" />
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react()],
  cacheDir: '../../node_modules/.vitest/admin-ui',
  resolve: {
    alias: {
      // slugify.ts реэкспортирует slugify из @letar/format-utils — пакет не хоистится
      // в node_modules (workspace без symlink), поэтому Vite не резолвит bare specifier
      '@letar/format-utils': resolve(__dirname, '../format-utils/src/index.ts'),
    },
  },
  test: {
    name: 'admin-ui',
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.tsx'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['node_modules', 'dist', '.next', 'e2e'],
    coverage: {
      provider: 'v8',
      reportsDirectory: '../../coverage/libs/admin-ui',
      reporter: ['text', 'json', 'html'],
    },
    clearMocks: true,
    restoreMocks: true,
    passWithNoTests: true,
  },
})
