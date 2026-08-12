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
    'server-errors': 'src/lib/server-errors/index.ts',
    analytics: 'src/lib/analytics/index.ts',
    'validators/ru': 'src/lib/validators/ru/index.ts',
  },
  format: ['esm'],
  // `noExternal` ниже действует только на JS-бандл — декларации собирает отдельный проход
  // (rollup-plugin-dts), и ему нужно своё разрешение инлайнить внутренние `@letar/*`.
  //
  // ⚠️ Одного этого флага мало, и «не сработало» здесь выглядит как «опция не действует».
  // tsup строит `external` для dts-прохода как `dependencies + peerDependencies` из
  // `package.json`; всё оттуда rollup помечает внешним ДО плагинов, поэтому резолвер даже не
  // вызывается (видно в `DEBUG=tsup:ts-resolve` — bare-пакетов в логе нет вовсе). Пока
  // `@letar/forms-core`/`forms-react` лежали в `dependencies`, `resolve` ниже был мёртвой
  // опцией. Их место — `devDependencies`: это внутренние слои, а не npm-пакеты, потребитель
  // их не устанавливает. Не возвращай их обратно в `dependencies` — сборка останется зелёной,
  // сломается только установка опубликованного пакета.
  dts: { resolve: [/^@letar\//] },
  tsconfig: 'tsconfig.publish.json',
  splitting: true,
  treeshake: true,
  clean: true,
  outDir: 'dist',
  // Все зависимости — external (потребитель устанавливает сам).
  // @letar/forms-core (Фаза 7.1) и @letar/forms-react (Фаза 7.3) — не npm-пакеты,
  // внутренние слои @letar/forms — вбандливаются внутрь.
  noExternal: ['@letar/forms-core', '@letar/forms-react'],
  external: [
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
