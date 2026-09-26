import { defineConfig } from 'tsup'

export default defineConfig({
  // Два entry: ядро пакета не знает про ZenStack — `@zenstackhq/tanstack-query` подключается только
  // в `zenstack.js`, обычный пользователь TanStack Query его не тянет (проверяет `dist-guard.spec.ts`).
  entry: {
    index: 'src/index.ts',
    zenstack: 'src/zenstack.ts',
  },
  format: ['esm'],
  // Типы `@letar/forms-core` (контракт опций) — внутренний слой, не npm-пакет: вбандливаем в декларации
  dts: { resolve: [/^@letar\//] },
  tsconfig: 'tsconfig.publish.json',
  splitting: true,
  treeshake: true,
  clean: true,
  outDir: 'dist',
  noExternal: ['@letar/forms-core'],
  external: ['react', 'react/jsx-runtime', '@tanstack/react-query', '@zenstackhq/tanstack-query', /^@zenstackhq\//],
  target: 'es2022',
  sourcemap: true,
})
