/// <reference types="vitest" />
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react()],
  cacheDir: '../../node_modules/.vitest/pravda',
  root: import.meta.dirname,
  test: {
    name: 'pravda',
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.tsx'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['node_modules', 'dist', '.next', 'e2e'],
    coverage: {
      provider: 'v8',
      reportsDirectory: '../../coverage/apps/pravda',
      reporter: ['text', 'json', 'html'],
    },
    clearMocks: true,
    restoreMocks: true,
  },
  resolve: {
    alias: {
      '@': resolve(import.meta.dirname, './src'),
      '@letar/hooks': resolve(import.meta.dirname, '../../libs/hooks/src'),
      '@letar/chakra-provider': resolve(import.meta.dirname, '../../libs/chakra-provider/src'),
    },
  },
})
