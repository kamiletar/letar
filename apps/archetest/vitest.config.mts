/// <reference types="vitest" />
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react()],
  cacheDir: '../../node_modules/.vitest/archetest',
  root: import.meta.dirname,
  test: {
    name: 'archetest',
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.tsx'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['node_modules', 'dist', '.next', 'e2e'],
    coverage: {
      provider: 'v8',
      reportsDirectory: '../../coverage/apps/archetest',
      reporter: ['text', 'json', 'html'],
    },
    // CI: job-level DATABASE_URL смотрит в пустую БД `ci` без схемы, а access-policies.test ходит в настоящую
    // БД (иначе набор пропускается). Подменяем на archetest_ci — её создаёт и наполняет шаг workflow
    // `Prepare test databases`. `test.env` спредится в Vitest последним, поверх process.env.
    env: process.env.CI ? { DATABASE_URL: 'postgresql://ci:ci@localhost:5432/archetest_ci' } : {},
    clearMocks: true,
    restoreMocks: true,
  },
  resolve: {
    alias: [
      { find: '@', replacement: resolve(import.meta.dirname, './src') },
      // Точное совпадение, не префикс: подпути `@letar/ui/*` сюда не должны попадать. В приложении
      // баррель резолвится через paths Next; в тестах он мокается (тянет `next/*`), но vi.mock
      // требует, чтобы модуль вообще резолвился
      { find: /^@letar\/ui$/, replacement: resolve(import.meta.dirname, '../../libs/ui/src/index.ts') },
      // Лёгкий баррель без next/*: резолвим настоящий модуль, мок не нужен
      { find: /^@letar\/hooks$/, replacement: resolve(import.meta.dirname, '../../libs/hooks/src/index.ts') },
      { find: /^@letar\/hooks\/utility$/, replacement: resolve(import.meta.dirname, '../../libs/hooks/src/utility.ts') },
    ],
  },
})
