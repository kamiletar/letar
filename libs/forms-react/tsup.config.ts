import { defineConfig } from 'tsup'

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    testing: 'src/lib/testing/index.ts',
  },
  format: ['esm'],
  dts: true,
  // Хуки и контекст формы работают только на клиенте: без директивы серверный компонент Next.js не отрендерит поле.
  // ⚠️ Директива не доходит до dist при `treeshake: true` (rollup выбрасывает её), см. libs/forms/tsup.config.ts.
  banner: { js: "'use client'" },
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
