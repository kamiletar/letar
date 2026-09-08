/// <reference types="vitest" />
import path from 'node:path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  cacheDir: '../../node_modules/.vitest/animatrona-folder-player',
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, 'shared'),
      '@letar/folder-scan': path.resolve(__dirname, '../../libs/folder-scan/src'),
    },
  },
  test: {
    name: 'animatrona-folder-player',
    environment: 'node',
    globals: true,
    // Покрываем чистую логику, не требующую electron: план транскодирования и детекция
    // кодеков в shared/. Main-процесс и рендерер проверяются иначе — см. PLAN_TESTING.md
    include: ['shared/**/*.{test,spec}.ts', 'main/**/*.{test,spec}.ts'],
    exclude: ['node_modules', 'dist', 'app', 'renderer/.next', 'renderer/out'],
    coverage: {
      provider: 'v8',
      reportsDirectory: '../../coverage/apps/animatrona-folder-player',
      reporter: ['text', 'json', 'html'],
    },
    clearMocks: true,
    restoreMocks: true,
  },
})
