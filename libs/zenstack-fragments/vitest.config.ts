/// <reference types="vitest" />
import { defineConfig } from 'vitest/config'

export default defineConfig({
  cacheDir: '../../node_modules/.vitest/zenstack-fragments',
  test: {
    name: '@letar/zenstack-fragments',
    environment: 'node',
    globals: true,
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['node_modules', 'dist'],
    coverage: {
      provider: 'v8',
      reportsDirectory: '../../coverage/libs/zenstack-fragments',
      reporter: ['text', 'json', 'html'],
    },
    clearMocks: true,
    restoreMocks: true,
    // Библиотека не содержит TS-кода (только .zmodel-фрагменты, см. src/index.ts) — тестировать
    // нечего, и это не должно считаться падением `nx test`.
    passWithNoTests: true,
  },
})
