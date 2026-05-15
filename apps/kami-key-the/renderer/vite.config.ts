import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
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
