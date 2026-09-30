import { defineConfig } from 'tsup'

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    client: 'src/client.ts',
  },
  format: ['esm'],
  dts: true,
  tsconfig: 'tsconfig.publish.json',
  splitting: true,
  treeshake: true,
  clean: true,
  outDir: 'dist',
  // Внутренние @letar/* не вбандливаем: forms-core — опубликованный peer, остальное — devDependencies-только-типы
  external: [/^@letar\//],
  target: 'es2022',
  sourcemap: true,
})
