import { defineConfig } from 'tsup'

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    offline: 'src/lib/offline/index.ts',
    i18n: 'src/lib/i18n/index.ts',
    // Категорийные entry points для tree-shaking
    'fields/text': 'src/lib/declarative/form-fields/text/index.ts',
    'fields/number': 'src/lib/declarative/form-fields/number/index.ts',
    'fields/datetime': 'src/lib/declarative/form-fields/datetime/index.ts',
    'fields/selection': 'src/lib/declarative/form-fields/selection/index.ts',
    'fields/boolean': 'src/lib/declarative/form-fields/boolean/index.ts',
    'fields/specialized': 'src/lib/declarative/form-fields/specialized/index.ts',
    // DX фичи (v0.80.0)
    'server-errors': 'src/server/server-errors/index.ts',
    'captcha/server': 'src/server/captcha/verify.ts',
    analytics: 'src/lib/analytics/index.ts',
    'validators/ru': 'src/lib/validators/ru/index.ts',
  },
  format: ['esm'],
  // Слои `@letar/forms-core` и `@letar/forms-react` — отдельные npm-пакеты (решение D1) и
  // остаются внешними как в JS-бандле, так и в декларациях. Вшивается только
  // `@letar/format-utils` (его нет в npm), поэтому `resolve` у dts-прохода ограничен им.
  //
  // ⚠️ Слои лежат в `devDependencies` рабочего package.json: tsup строит `external` dts-прохода
  // из `dependencies + peerDependencies`, и без явного `external` ниже rollup мог бы
  // инлайнить их типы через `paths` из tsconfig.publish.json. Зависимость в готовом пакете
  // появляется из package.publish.json (`workspace:^` → `^версия`, см.
  // scripts/write-publish-package-json.mjs).
  dts: { resolve: [/^@letar\/format-utils/] },
  tsconfig: 'tsconfig.publish.json',
  splitting: true,
  treeshake: true,
  clean: true,
  outDir: 'dist',
  // Все зависимости — external (потребитель устанавливает сам), кроме format-utils (в npm его нет).
  noExternal: ['@letar/format-utils'],
  external: [
    // Слои формы — отдельные npm-пакеты (dependencies в package.publish.json)
    /^@letar\/forms-(core|react)(\/|$)/,
    // React
    'react',
    'react-dom',
    'react/jsx-runtime',
    // UI
    '@chakra-ui/react',
    'framer-motion',
    'react-icons/lu',
    // Формы
    '@tanstack/react-form',
    // Валидация
    'zod',
    'zod/v4',
    'zod/v4/core',
    // DnD (optional)
    '@dnd-kit/core',
    '@dnd-kit/sortable',
    '@dnd-kit/utilities',
    // RichText (optional)
    /^@tiptap\//,
    // JSON viewer (optional, for DebugValues)
    /^@uiw\/react-json-view/,
    // Offline (optional)
    'idb-keyval',
    // i18n (optional)
    'next-intl',
    // CAPTCHA (optional)
    '@marsidev/react-turnstile',
    // DataGrid (optional)
    '@tanstack/react-table',
    '@tanstack/react-virtual',
    // Next.js
    'next/navigation',
  ],
  jsx: 'automatic',
  target: 'es2022',
  sourcemap: true,
})
