/// <reference types="vitest" />
import react from '@vitejs/plugin-react'
import { readFileSync } from 'fs'
import { resolve } from 'path'
import { defineConfig } from 'vitest/config'

const formsCoreExports = JSON.parse(
  readFileSync(resolve(__dirname, '../forms-core/package.json'), 'utf-8'),
).exports

// Vite/rollup-plugin-alias matches object-form aliases by prefix, first match wins — the bare
// `@letar/forms-core` key MUST sort after every subpath key, or it hijacks `/schema`, `/utils`
// etc. before their own (more specific) entry is ever reached. `exports` lists `.` first, so
// sort by key length descending rather than relying on `Object.entries` order.
const formsCoreAlias = Object.fromEntries(
  Object.entries(formsCoreExports)
    .filter(([subpath]) => subpath !== './package.json')
    .map(([subpath, target]) => [
      subpath === '.' ? '@letar/forms-core' : `@letar/forms-core${subpath.slice(1)}`,
      resolve(__dirname, '../forms-core', target['@letar/source']),
    ])
    .sort(([a], [b]) => b.length - a.length),
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
      ...formsCoreAlias,
      // `@letar/forms-react` обязан стоять ДО `@letar/forms`: alias матчится по префиксу,
      // первый подошедший выигрывает — иначе короткий ключ перехватит и композиционный слой
      // отрезолвится внутрь скина. Та же грабля, что и с bare-ключом `forms-core` выше.
      '@letar/forms-react': resolve(__dirname, '../forms-react/src'),
      '@letar/forms': resolve(__dirname, './src'),
    },
  },
})
