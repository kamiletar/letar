/// <reference types="vitest" />
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react()],
  cacheDir: '../../node_modules/.vitest/animatrona-tracker',
  test: {
    name: 'animatrona-tracker',
    environment: 'jsdom',
    globals: true,
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['node_modules', 'dist', '.next', 'e2e'],
    passWithNoTests: true,
    // В CI job-level DATABASE_URL (ci.yml) — фиктивная строка только для `prisma generate`,
    // без реального коннекта. route.spec.ts делает настоящие запросы через `@/lib/db`, поэтому
    // здесь подменяем на CI-БД (создаётся и получает схему отдельным шагом workflow до этого
    // таргета). `test.env` спредится ПОСЛЕДНИМ поверх process.env в самом Vitest (worker pool
    // в cli-api.*.js), поэтому реально переопределяет, а не игнорируется как «уже загруженная»
    // переменная — в отличие от механизма dotenv-каскада Nx. Локально (без CI) не трогаем:
    // разработчик держит свою БД в .env.local.
    env: process.env.CI ? { DATABASE_URL: 'postgresql://ci:ci@localhost:5432/animatrona_tracker_ci' } : {},
    coverage: {
      provider: 'v8',
      reportsDirectory: '../../coverage/apps/animatrona-tracker',
      reporter: ['text', 'json', 'html'],
    },
    clearMocks: true,
    restoreMocks: true,
  },
  resolve: {
    alias: {
      '@': resolve(import.meta.dirname, './src'),
    },
  },
})
