/// <reference types="vitest" />
import { buildFormsCoreAlias } from '@letar/forms-core/testing'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import { defineConfig } from 'vitest/config'

const formsCoreAlias = buildFormsCoreAlias(resolve(__dirname, '../forms-core'))

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
