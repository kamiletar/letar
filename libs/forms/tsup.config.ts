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
  dts: false,
  tsconfig: 'tsconfig.publish.json',
  splitting: true,
  treeshake: true,
  clean: true,
  outDir: 'dist',
  // Все зависимости — external (потребитель устанавливает сам)
  noExternal: [],
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
    // Маски (optional)
    'use-mask-input',
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
