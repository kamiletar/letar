/// <reference types="vitest" />
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react()],
  cacheDir: '../../node_modules/.vitest/driving-school',
  root: __dirname,
  test: {
    name: 'driving-school',
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['node_modules', 'dist', '.next'],
    coverage: {
      provider: 'v8',
      reportsDirectory: '../../coverage/apps/driving-school',
      reporter: ['text', 'json', 'html'],
    },
    clearMocks: true,
    restoreMocks: true,
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@test-utils': resolve(__dirname, './src/test-utils'),
      '@letar/driving-school-db/schema': resolve(__dirname, '../../libs/driving-school-db/src/generated/schema.ts'),
      '@letar/driving-school-db/prisma/enums': resolve(
        __dirname,
        '../../libs/driving-school-db/src/generated/prisma/enums.ts'
      ),
      '@letar/driving-school-db/prisma': resolve(
        __dirname,
        '../../libs/driving-school-db/src/generated/prisma/index.ts'
      ),
      '@letar/driving-school-db/models': resolve(__dirname, '../../libs/driving-school-db/src/generated/models.ts'),
      '@letar/driving-school-db/input': resolve(__dirname, '../../libs/driving-school-db/src/generated/input.ts'),
      '@letar/driving-school-db/form-schemas': resolve(
        __dirname,
        '../../libs/driving-school-db/src/generated/form-schemas'
      ),
      '@letar/driving-school-db': resolve(__dirname, '../../libs/driving-school-db/src/index.ts'),
      '@letar/format-utils': resolve(__dirname, '../../libs/format-utils/src'),
      '@letar/api-server': resolve(__dirname, '../../libs/api-server/src'),
      '@letar/validation-utils': resolve(__dirname, '../../libs/validation-utils/src'),
      '@letar/email': resolve(__dirname, '../../libs/email/src'),
      '@letar/ui': resolve(__dirname, '../../libs/ui/src'),
    },
  },
})
