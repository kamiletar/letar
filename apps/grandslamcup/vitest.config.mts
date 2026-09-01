/// <reference types="vitest" />
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react()],
  cacheDir: '../../node_modules/.vitest/grandslamcup',
  test: {
    name: 'grandslamcup',
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.tsx'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['node_modules', 'dist', '.next', 'e2e'],
    coverage: {
      provider: 'v8',
      reportsDirectory: '../../coverage/apps/grandslamcup',
      reporter: ['text', 'json', 'html'],
    },
    clearMocks: true,
    restoreMocks: true,
  },
  resolve: {
    alias: {
      '@': resolve(import.meta.dirname, './src'),
      // Подпуть объявляем раньше корня: иначе '@letar/image-upload' совпадёт первым
      // и '/server' приклеится к пути основной точки входа.
      '@letar/image-upload/server': resolve(import.meta.dirname, '../../libs/image-upload/src/server'),
      '@letar/image-upload': resolve(import.meta.dirname, '../../libs/image-upload/src'),
    },
  },
})
