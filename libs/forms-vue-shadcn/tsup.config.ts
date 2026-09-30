import { defineConfig } from 'tsup'

export default defineConfig({
  entry: {
    index: 'src/index.ts',
  },
  format: ['esm'],
  dts: true,
  tsconfig: 'tsconfig.publish.json',
  splitting: true,
  treeshake: true,
  clean: true,
  outDir: 'dist',
  // Внутренние @letar/* не вбандливаем: forms-core — опубликованный peer, остальное — devDependencies-только-типы
  noExternal: ['@letar/tailwind-utils'],
  external: [/^@letar\/(?!tailwind-utils)/],
  target: 'es2022',
  sourcemap: true,
})
