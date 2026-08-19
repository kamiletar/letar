# @letar/theme-check

Общая логика гейта сырых UI-значений (`theme:check`) — regex-проверка HEX/`rgb()`/`hsl()`-цветов,
сырых теней, `transition`/`transitionDuration` с числовой длительностью и `scale()` вне шкалы темы
внутри `src/**/*.ts(x)` приложения. Раньше была дословно скопирована в
`apps/aboi/scripts/check-theme-hardcodes.mjs`, `apps/studio/scripts/check-theme-hardcodes.mjs` и
`apps/domwellbes/scripts/check-theme-hardcodes.mjs` — см.
[`.claude/docs/theme-hardcode-gate-coverage.md`](/.claude/docs/theme-hardcode-gate-coverage.md) за
историей трёх независимых конфигураций до выноса сюда.

## Почему plain JS (`.mjs`), а не TypeScript как остальные библиотеки монорепо

Скрипт `apps/<app>/scripts/check-theme-hardcodes.mjs` запускается таргетом `theme:check` напрямую
через `node scripts/check-theme-hardcodes.mjs` (`nx:run-commands`) — без бандлера, без `tsc`/`tsgo`,
без Next.js. Механизм резолва `@letar/*`-библиотек через `paths` в `tsconfig.json` и условие
`@letar/source` в `customConditions` работает **только** внутри TypeScript-инструментов (компилятор,
бандлер) — голый `node` их не видит вообще и bare-специфер `@letar/theme-check` резолвит по
обычным правилам Node (`package.json#main`/`#exports` через симлинк в `node_modules`, который
создаёт `bun install` для пакета, перечисленного в `nx.implicitDependencies` приложения).

Отсюда: экспортируемый код должен быть исполняемым JS-файлом сразу, без шага компиляции — поэтому
`.mjs`, а не `.ts`. См. чек-лист «Несколько точек входа» в
[`lib-entry-points.md`](/.claude/docs/lib-entry-points.md) — вся механика `paths`/`transpilePackages`
там описана именно для случая, когда потребитель компилируется бандлером; этот пакет — исключение
по той же причине, по которой генератор `theme-check-integrate` кладёт итоговый скрипт прямо в
`apps/<app>/scripts/`, а не собирает его.

## API

```js
import { DEFAULT_GUIDANCE, findThemeHardcodes, FORBIDDEN_PATTERNS, runThemeCheckCli } from '@letar/theme-check'
```

- **`findThemeHardcodes(options)`** — чистая функция, возвращает массив находок
  `{ file, line, label, value }`. Используется тестом и `runThemeCheckCli`.
- **`runThemeCheckCli(options)`** — CLI-обёртка: печатает находки в `console.error`, выставляет
  `process.exitCode = 1` при непустом результате. Это то, что вызывает каждый
  `apps/<app>/scripts/check-theme-hardcodes.mjs`.
- **`FORBIDDEN_PATTERNS`** — экспортируемый дефолтный список правил (можно переопределить через
  `options.forbiddenPatterns`, если приложению нужен свой набор — на 2026-08-19 такого потребителя
  нет, все три приложения используют дефолт без изменений).
- **`DEFAULT_GUIDANCE`** — текст подсказки по умолчанию, если приложение не передаёт своё `guidance`.

### `options`

| Поле                    | По умолчанию                    | Смысл                                                                         |
| ----------------------- | ------------------------------- | ----------------------------------------------------------------------------- |
| `projectRoot`           | —, обязателен                   | Корень приложения (`resolve(import.meta.dirname, '..')` в скрипте)            |
| `sourceDirName`         | `'src'`                         | Каталог с исходниками относительно `projectRoot`                              |
| `ignoredDirectories`    | `new Set(['generated'])`        | Имена каталогов (на любой глубине), полностью исключаемых из обхода           |
| `themePrefix`           | `` `${sourceDirName}/theme/` `` | Префикс пути, освобождённый от правил без `includeTheme: true`                |
| `allowedMatches`        | `new Map()`                     | `Map<projectPath, Set<matchedText>>` — точечный allowlist конкретных значений |
| `guidance` (только CLI) | `DEFAULT_GUIDANCE`              | Текст-подсказка, печатаемый под списком находок                               |

## Пример — тонкая обёртка приложения

```js
// apps/<app>/scripts/check-theme-hardcodes.mjs
import { runThemeCheckCli } from '@letar/theme-check'
import { resolve } from 'node:path'

await runThemeCheckCli({
  projectRoot: resolve(import.meta.dirname, '..'),
  ignoredDirectories: new Set(['generated', 'pdf']),
  allowedMatches: new Map([
    ['src/app/manifest.ts', new Set(['#1A1A2E'])],
  ]),
  guidance: 'Перенесите повторяемое значение в semantic token/layerStyle...',
})
```

## Подключение нового (четвёртого+) потребителя

Не руками — через генератор, который уже собирает этот же вызов автоматически:

```bash
nx g @letar/generators:theme-check-integrate <app>
```

Подробности генератора — `libs/generators/README.md` § `theme-check-integrate`. Если подключаешь
руками (например, приложение с нестандартной структурой) — не забудь:

1. `@letar/theme-check` в `nx.implicitDependencies` приложения (`package.json`) + `bun install` —
   иначе `node_modules/@letar/theme-check` не появится и `node` не сможет резолвить импорт.
2. Таргет `theme:check` в `project.json` (`nx:run-commands`, `command: "node scripts/check-theme-hardcodes.mjs"`)
   и `dependsOn` у `lint`.
