import baseConfig from '../../../eslint.config.mjs'

export default [
  ...baseConfig,
  { ignores: ['dist/**/*', 'webpack.config.js'] },
  // Allow-list из корневого eslint.config.mjs для NODE_ENV === 'production' в Electron
  // main-процессе (`files: ['main/**/*.ts', 'apps/*/main/**/*.ts']`) сюда не достаёт: раз
  // ESLint находит ЭТОТ файл как ближайший конфиг для main/*.ts, basePath для сопоставления
  // его `files`-паттернов — сам apps/label-printer-desktop/main/, а не каталог приложения
  // или корень репо. Оба паттерна требуют сегмент `main/` в начале пути, которого здесь уже
  // нет (пути относительно этого basePath — `background.ts`, `services/database.ts` и т.п.).
  // Третий вариант пути в корневой allow-list не добавить: тот массив конфигов переиспользуется
  // на всех basePath разом, и голый `**/*.ts` там выключил бы правило вообще для всего репо.
  // Локальный override здесь безопасен — этот файл управляет исключительно поддеревом main/.
  // Подробности — .claude/docs/node-env-not-production-signal.md § Электрон main-процесс,
  // вложенный eslint.config.mjs.
  {
    files: ['**/*.ts'],
    rules: {
      'no-restricted-syntax': 'off',
    },
  },
]
