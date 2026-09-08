import nx from '@nx/eslint-plugin'
import { createRequire } from 'node:module'
import baseConfig from '../../eslint.config.mjs'

// ⚠️ Пресет `@react-native/eslint-config/flat` целиком подключить НЕЛЬЗЯ: он тянет
// `eslint-plugin-eslint-comments@3.2.0`, несовместимый с ESLint 10 — падает весь прогон с
// `TypeError: context.getSourceCode is not a function`. По той же причине недоступен
// `eslint-plugin-react-native@5.0.0` (`lib/util/Components.js`), а вместе с ним его правила
// `no-unused-styles` / `no-inline-styles` / `split-platform-components`. Вернуть их можно будет
// только после апдейта плагинов под ESLint 10. Проверено 2026-09-08.
//
// Поэтому из RN-пресета берём вручную две годные части: рабочий плагин `@react-native`
// (правило `no-deep-imports`) и список глобалов рантайма.
//
// ⚠️ `@react-native/eslint-plugin` — транзитивная зависимость пакета `@react-native/eslint-config`,
// а не прямая зависимость репозитория. Под изолированной установкой bun голый
// `import '@react-native/eslint-plugin'` его не резолвит (реальная копия лежит в
// `node_modules/.bun/...`, а не в корневом `node_modules`). Обход — `createRequire` от уже
// резолвленного entry-файла пакета-родителя, см.
// .claude/docs/nested-package-resolution-under-bun-isolated-installs.md
const requireFromRnConfig = createRequire(import.meta.resolve('@react-native/eslint-config/flat'))
const reactNativeMetaPlugin = requireFromRnConfig('@react-native/eslint-plugin')

// Глобальные переменные рантайма React Native — подмножество `globals` из
// `@react-native/eslint-config/shared.js`.
const reactNativeGlobals = {
  __DEV__: 'readonly',
  __dirname: 'readonly',
  __fbBatchedBridgeConfig: 'readonly',
  ErrorUtils: 'readonly',
  global: 'readonly',
  process: 'readonly',
  require: 'readonly',
  module: 'writable',
  exports: 'writable',
  console: 'readonly',
  fetch: 'readonly',
  navigator: 'readonly',
  alert: 'readonly',
  AbortController: 'readonly',
  Blob: 'readonly',
  File: 'readonly',
  FileReader: 'readonly',
  FormData: 'readonly',
  Headers: 'readonly',
  Request: 'readonly',
  Response: 'readonly',
  URL: 'readonly',
  URLSearchParams: 'readonly',
  WebSocket: 'readonly',
  XMLHttpRequest: 'readonly',
  TextEncoder: 'readonly',
  TextDecoder: 'readonly',
  setTimeout: 'readonly',
  clearTimeout: 'readonly',
  setInterval: 'readonly',
  clearInterval: 'readonly',
  setImmediate: 'readonly',
  clearImmediate: 'readonly',
  requestAnimationFrame: 'readonly',
  cancelAnimationFrame: 'readonly',
  requestIdleCallback: 'readonly',
  cancelIdleCallback: 'readonly',
  queueMicrotask: 'readonly',
  performance: 'readonly',
  structuredClone: 'readonly',
}

export default [
  ...nx.configs['flat/react-typescript'],
  ...baseConfig,
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.js'],
    languageOptions: {
      globals: reactNativeGlobals,
    },
    plugins: {
      '@react-native': reactNativeMetaPlugin,
    },
    rules: {
      // Глубокий импорт из внутренностей react-native ломается на минорных апдейтах
      '@react-native/no-deep-imports': 'error',
    },
  },
  {
    ignores: ['android/**', 'ios/**', 'dist/**', 'build/**', '.bundle/**', 'vendor/**'],
  },
]
