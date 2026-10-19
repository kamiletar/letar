import { defineConfig } from 'tsup'

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    testing: 'src/lib/testing/index.ts',
  },
  format: ['esm'],
  dts: true,
  // Хуки и контекст формы работают только на клиенте: без директивы серверный компонент Next.js не отрендерит поле.
  banner: { js: "'use client'" },
  tsconfig: 'tsconfig.publish.json',
  splitting: true,
  // ⚠️ Только `false`: при `true` tsup пропускает бандл через rollup, а тот выбрасывает директиву
  // `'use client'` из banner (предупреждение «Module level directives cause errors when bundled»).
  // Tree-shaking потребителя это не затрагивает: бандл остаётся ESM со `splitting`.
  treeshake: false,
  clean: true,
  outDir: 'dist',
  // Внутренние @letar/* не вбандливаем: forms-core — опубликованный peer, остальное — devDependencies-только-типы
  external: [/^@letar\//],
  target: 'es2022',
  sourcemap: true,
})
