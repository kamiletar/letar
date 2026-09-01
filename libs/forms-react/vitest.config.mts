/// <reference types="vitest" />
import { buildFormsCoreAlias } from '@letar/forms-core/testing'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import { defineConfig } from 'vitest/config'

const formsCoreAlias = buildFormsCoreAlias(resolve(__dirname, '../forms-core'))

export default defineConfig({
  plugins: [react()],
  cacheDir: '../../node_modules/.vitest/forms-react',
  root: __dirname,
  test: {
    name: '@letar/forms-react',
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['node_modules', 'dist'],
    coverage: {
      provider: 'v8',
      reportsDirectory: '../../coverage/libs/forms-react',
      reporter: ['text', 'json', 'html'],
    },
    clearMocks: true,
    restoreMocks: true,
  },
  resolve: {
    alias: formsCoreAlias,
  },
})
