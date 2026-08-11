/// <reference types="vitest" />
import { buildFormsCoreAlias } from '@letar/forms-core/testing'
import { resolve } from 'path'
import { defineConfig } from 'vitest/config'

const formsCoreAlias = buildFormsCoreAlias(resolve(__dirname, '../forms-core'))

export default defineConfig({
  cacheDir: '../../node_modules/.vitest/forms-vue-shadcn',
  root: __dirname,
  test: {
    name: '@letar/forms-vue-shadcn',
    environment: 'jsdom',
    globals: true,
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['node_modules', 'dist'],
    coverage: {
      provider: 'v8',
      reportsDirectory: '../../coverage/libs/forms-vue-shadcn',
      reporter: ['text', 'json', 'html'],
    },
    clearMocks: true,
    restoreMocks: true,
  },
  resolve: {
    alias: {
      ...formsCoreAlias,
      '@letar/forms-vue': resolve(__dirname, '../forms-vue/src/index.ts'),
    },
  },
})
