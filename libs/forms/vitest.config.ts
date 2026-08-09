/// <reference types="vitest" />
import react from '@vitejs/plugin-react'
import { readFileSync } from 'fs'
import { resolve } from 'path'
import { defineConfig } from 'vitest/config'

const formsCoreExports = JSON.parse(
  readFileSync(resolve(__dirname, '../forms-core/package.json'), 'utf-8'),
).exports

const formsCoreAlias = Object.fromEntries(
  Object.entries(formsCoreExports)
    .filter(([subpath]) => subpath !== './package.json')
    .map(([subpath, target]) => [
      subpath === '.' ? '@letar/forms-core' : `@letar/forms-core${subpath.slice(1)}`,
      resolve(__dirname, '../forms-core', target['@letar/source']),
    ]),
)

export default defineConfig({
  plugins: [react()],
  cacheDir: '../../node_modules/.vitest/forms',
  root: __dirname,
  test: {
    name: '@letar/forms',
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['node_modules', 'dist'],
    coverage: {
      provider: 'v8',
      reportsDirectory: '../../coverage/libs/forms',
      reporter: ['text', 'json', 'html'],
    },
    clearMocks: true,
    restoreMocks: true,
  },
  resolve: {
    alias: {
      '@letar/forms-core/validators/ru': resolve(__dirname, '../forms-core/src/lib/validators/ru/index.ts'),
      '@letar/forms-core/schema': resolve(__dirname, '../forms-core/src/lib/schema/index.ts'),
      '@letar/forms-core/server-errors': resolve(__dirname, '../forms-core/src/lib/server-errors/index.ts'),
      '@letar/forms-core/utils': resolve(__dirname, '../forms-core/src/lib/utils/index.ts'),
      '@letar/forms-core/security': resolve(__dirname, '../forms-core/src/lib/security/index.ts'),
      '@letar/forms-core/offline': resolve(__dirname, '../forms-core/src/lib/offline/index.ts'),
      '@letar/forms-core/captcha': resolve(__dirname, '../forms-core/src/lib/captcha/index.ts'),
      '@letar/forms-core/analytics': resolve(__dirname, '../forms-core/src/lib/analytics/index.ts'),
      '@letar/forms-core/credit-card': resolve(__dirname, '../forms-core/src/lib/credit-card/index.ts'),
      '@letar/forms-core/phone': resolve(__dirname, '../forms-core/src/lib/phone/index.ts'),
      '@letar/forms-core/table': resolve(__dirname, '../forms-core/src/lib/table/index.ts'),
      '@letar/forms-core/address': resolve(__dirname, '../forms-core/src/lib/address/index.ts'),
      '@letar/forms-core/i18n': resolve(__dirname, '../forms-core/src/lib/i18n/index.ts'),
      '@letar/forms-core': resolve(__dirname, '../forms-core/src/index.ts'),
      '@letar/forms': resolve(__dirname, './src'),
    },
  },
})
