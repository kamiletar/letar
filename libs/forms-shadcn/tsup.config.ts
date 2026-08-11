import { defineConfig } from 'tsup'

export default defineConfig({
  // Один entry point, не по образцу категорийных `fields/text` и т.п. из `@letar/forms`.
  // Причина: `src/lib/fields/**` у `forms-shadcn` плоская, без категорийных подпапок —
  // категорийный сплиттинг потребовал бы либо реорганизации файлов (не оправдана ради
  // публикации), либо ручных barrel-файлов по категориям без физического соответствия
  // структуре (лишний слой синхронизации). Тяжёлые поля (`FieldRichText`/`FieldDataGrid`) уже
  // изолированы через `lazy()` + dynamic `import()` внутри самого поля (см. README) — это даёт
  // рантайм-код-сплиттинг у любого бандлера потребителя (Vite/webpack/Next.js) независимо от
  // числа tsup-entry: динамическая граница `import()` не инлайнится в основной чанк. Отложить
  // категорийные entry на будущее, если появится сигнал (bundle-size данные от реальных
  // потребителей, второй showcase-потребитель, Фаза 7.4).
  entry: {
    index: 'src/index.ts',
  },
  format: ['esm'],
  // См. комментарий в libs/forms/tsup.config.ts — тот же принцип: `@letar/forms-core` и
  // `@letar/forms-react` внутренние слои (devDependencies, не npm-пакеты), поэтому вбандливаются
  // внутрь, а `dts.resolve` нужен отдельно для прохода деклараций (rollup-plugin-dts строит
  // `external` из `dependencies`+`peerDependencies`, `noExternal` для JS-бандла его не касается).
  dts: { resolve: [/^@letar\//] },
  tsconfig: 'tsconfig.publish.json',
  splitting: true,
  treeshake: true,
  clean: true,
  outDir: 'dist',
  noExternal: ['@letar/forms-core', '@letar/forms-react'],
  external: [
    // React
    'react',
    'react-dom',
    'react/jsx-runtime',
    // Формы
    '@tanstack/react-form',
    // Валидация
    'zod',
    'zod/v4',
    'zod/v4/core',
    // Стили (core-утилита cn(), используется всеми полями)
    'class-variance-authority',
    'clsx',
    'tailwind-merge',
    // Иконки (core, используются в 16 полях: Rating, NumberInput-степпер, FileUpload и т.д.)
    'lucide-react',
    // Radix-примитивы — per-field, не все потребители используют все поля
    '@radix-ui/react-checkbox',
    '@radix-ui/react-label',
    '@radix-ui/react-popover',
    '@radix-ui/react-radio-group',
    '@radix-ui/react-select',
    '@radix-ui/react-slider',
    '@radix-ui/react-switch',
    '@radix-ui/react-toggle-group',
    // RichText (optional, lazy-изолирован внутри FieldRichText)
    /^@tiptap\//,
    // DataGrid (optional, lazy-изолирован внутри FieldDataGrid)
    '@tanstack/react-table',
  ],
  jsx: 'automatic',
  target: 'es2022',
  sourcemap: true,
})
