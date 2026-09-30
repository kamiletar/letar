import { defineConfig } from 'tsup'

export default defineConfig({
  // Два entry: ядро пакета не знает про ZenStack — `@zenstackhq/tanstack-query` подключается только
  // в `zenstack.js`, обычный пользователь TanStack Query его не тянет (проверяет `dist-guard.spec.ts`).
  entry: {
    index: 'src/index.ts',
    zenstack: 'src/zenstack.ts',
  },
  format: ['esm'],
  // `@letar/forms-core` — опубликованный peer (в devDependencies для workspace): не вбандливается
  dts: true,
  tsconfig: 'tsconfig.publish.json',
  splitting: true,
  treeshake: true,
  clean: true,
  outDir: 'dist',
  external: [
    /^@letar\//,
    'react',
    'react/jsx-runtime',
    '@tanstack/react-query',
    '@zenstackhq/tanstack-query',
    /^@zenstackhq\//,
  ],
  target: 'es2022',
  sourcemap: true,
})
