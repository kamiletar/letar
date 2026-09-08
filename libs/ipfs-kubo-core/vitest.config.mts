/// <reference types="vitest" />
import { defineConfig } from 'vitest/config'

export default defineConfig({
  cacheDir: '../../node_modules/.vitest/ipfs-kubo-core',
  test: {
    name: '@letar/ipfs-kubo-core',
    environment: 'node',
    globals: true,
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['node_modules', 'dist'],
    coverage: {
      provider: 'v8',
      reportsDirectory: '../../coverage/libs/ipfs-kubo-core',
      reporter: ['text', 'json', 'html'],
    },
    clearMocks: true,
    restoreMocks: true,
  },
})
