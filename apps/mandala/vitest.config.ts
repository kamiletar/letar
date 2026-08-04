/// <reference types="vitest" />
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react()],
  cacheDir: '../../node_modules/.vitest/mandala',
  root: __dirname,
  test: {
    name: 'mandala',
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['node_modules', 'dist', '.next'],
    coverage: {
      provider: 'v8',
      reportsDirectory: '../../coverage/apps/mandala',
      reporter: ['text', 'json', 'html'],
    },
    clearMocks: true,
    restoreMocks: true,
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      // Подпуть объявляем раньше корня: иначе '@letar/image-upload' совпадёт первым
      // и '/server' приклеится к пути основной точки входа.
      '@letar/image-upload/server': resolve(__dirname, '../../libs/image-upload/src/server'),
      '@letar/image-upload': resolve(__dirname, '../../libs/image-upload/src'),
    },
  },
})
