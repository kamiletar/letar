import path from 'node:path'

import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@letar/ui': path.resolve(__dirname, '../../../libs/ui/src/index.ts'),
    },
    dedupe: ['react', 'react-dom'],
  },
  base: './',
  root: __dirname,
  build: {
    outDir: '../app/renderer',
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    strictPort: false,
    // Явная конфигурация HMR для Electron
    hmr: {
      protocol: 'ws',
      host: 'localhost',
    },
  },
})
