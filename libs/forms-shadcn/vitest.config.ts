/// <reference types="vitest" />
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import { defineConfig } from 'vitest/config'
import { buildFormsCoreAlias } from '../forms-core/testing/vitest-alias'

const formsCoreAlias = buildFormsCoreAlias(resolve(__dirname, '../forms-core'))

export default defineConfig({
  plugins: [react()],
  cacheDir: '../../node_modules/.vitest/forms-shadcn',
  root: __dirname,
  test: {
    name: '@letar/forms-shadcn',
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['node_modules', 'dist'],
    coverage: {
      provider: 'v8',
      reportsDirectory: '../../coverage/libs/forms-shadcn',
      reporter: ['text', 'json', 'html'],
    },
    clearMocks: true,
    restoreMocks: true,
  },
  resolve: {
    alias: {
      ...formsCoreAlias,
      '@letar/forms-react/testing': resolve(__dirname, '../forms-react/src/lib/testing/index.ts'),
      '@letar/forms-react': resolve(__dirname, '../forms-react/src/index.ts'),
    },
  },
})
