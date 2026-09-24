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
    ],
  },
})
