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
    setupFiles: ['./vitest.setup.ts'],
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
      // Подпуть перед голым пакетом — rollup-plugin-alias матчит по префиксу (см. предупреждение
      // в forms-core/README.md), иначе '@letar/forms-vue/core' резолвился бы как
      // '@letar/forms-vue' + '/core' в файловой системе, не в './core.ts'.
      '@letar/forms-vue/core': resolve(__dirname, '../forms-vue/src/core.ts'),
      '@letar/forms-vue': resolve(__dirname, '../forms-vue/src/index.ts'),
    },
  },
})
