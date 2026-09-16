import { defineConfig } from 'tsup'

export default defineConfig({
  entry: { cli: 'src/cli.ts' },
  format: ['esm'],
  dts: false, // CLI-утилита, не библиотека — dts не нужны
  sourcemap: true,
  target: 'es2022',
  splitting: false,
  clean: true,
  // MCP SDK v2 — peer dependency (устанавливается пользователем через npx)
  // zod — peer dependency MCP SDK, бандлить не нужно
  external: ['@modelcontextprotocol/server', 'zod'],
})
