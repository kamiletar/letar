# @letar/eager-jsx-check

Регресс-гейт против бага «eager JSX на верхнем уровне модуля» — regex-проверка `.tsx`-файлов на
JSX-элемент, создаваемый **при импорте модуля** (значение свойства объекта, top-level `const`,
аргумент top-level вызова функции), а не внутри `render`/фабрики.

## Почему это баг

Next.js всегда собирает JSX через automatic runtime (SWC сам выбирает трансформ) — такой код
работает в приложении незаметно для разработчика. Но `tsx`/esbuild (используется `prisma/seed.ts`
любого приложения) резолвит JSX-трансформ по `tsconfig` **вызывающего** приложения: пресет
`tsconfig.next-app.json` держит `"jsx": "preserve"`, esbuild трактует это как classic-трансформ
(`React.createElement`) и падает `ReferenceError: React is not defined` прямо на этапе импорта —
до всякого рендера. Полный разбор инцидента и трёх реальных мест бага в `@letar/forms` —
[`.claude/docs/letar-forms-lazy-component-eager-jsx-seed-crash.md`](/.claude/docs/letar-forms-lazy-component-eager-jsx-seed-crash.md).

## Почему plain JS (`.mjs`), а не TypeScript

Тот же случай, что и у [`@letar/theme-check`](/libs/theme-check/README.md) — скрипт запускается
напрямую через `node scripts/check-eager-jsx.mjs` (`nx:run-commands`), без бандлера и без
`tsc`/`tsgo`. Резолв `@letar/*` через `paths`/`customConditions` работает только внутри
TypeScript-инструментов; голому `node` нужен исполняемый JS-файл сразу.

## API

```js
import { DEFAULT_GUIDANCE, findEagerJsx, FORBIDDEN_PATTERNS, runEagerJsxCheckCli } from '@letar/eager-jsx-check'
```

- **`findEagerJsx(options)`** — чистая функция, возвращает массив находок
  `{ file, line, label, value }`.
- **`runEagerJsxCheckCli(options)`** — CLI-обёртка: печатает находки в `console.error`, выставляет
  `process.exitCode = 1` при непустом результате.
- **`FORBIDDEN_PATTERNS`** — три правила: JSX как значение свойства объекта (`icon: <LuBold />`),
  JSX как top-level инициализатор `const` (`export const fallback = <Skeleton />`), JSX как
  top-level аргумент вызова функции (`export const X = createY(fn, <Skeleton />)`).
- **`DEFAULT_GUIDANCE`** — текст подсказки по умолчанию.

### `options`

| Поле                 | По умолчанию             | Смысл                                                                         |
| -------------------- | ------------------------ | ----------------------------------------------------------------------------- |
| `projectRoot`        | —, обязателен            | Корень библиотеки/приложения (`resolve(import.meta.dirname, '..')` в скрипте) |
| `sourceDirName`      | `'src'`                  | Каталог с исходниками относительно `projectRoot`                              |
| `ignoredDirectories` | `new Set(['generated'])` | Имена каталогов (на любой глубине), полностью исключаемых из обхода           |
| `allowedMatches`     | `new Map()`              | `Map<projectPath, Set<matchedTag>>` — точечный allowlist конкретных тегов     |
| `guidance` (CLI)     | `DEFAULT_GUIDANCE`       | Текст-подсказка, печатаемый под списком находок                               |

## Ограничения (не AST, а regex-эвристика)

- Проверка построчная в пределах одного `content.matchAll` — не разбирает многострочные
  выражения. JSX-аргумент вызова, растянутый на несколько строк, не поймается правилом
  «top-level аргумент вызова функции».
  `render:`/стрелочные функции внутри объекта (`icon: () => <Icon />`) — не считаются находкой,
  как и любой JSX внутри тела функции (регекс якорится на начало строки без отступа).
- Заведомо не ловит JSX, обёрнутый в промежуточную функцию без слова `const`/`let`/`export`
  (`Object.freeze({ icon: <X /> })` без присваивания переменной) — такого паттерна пока не было
  найдено в реальном коде библиотек форм, добавлять правило заранее не стали (YAGNI).

## Пример — тонкая обёртка библиотеки

```js
// libs/<lib>/scripts/check-eager-jsx.mjs
import { runEagerJsxCheckCli } from '@letar/eager-jsx-check'
import { resolve } from 'node:path'

await runEagerJsxCheckCli({
  projectRoot: resolve(import.meta.dirname, '..'),
})
```

## Подключено к

`@letar/forms`, `@letar/forms-react`, `@letar/forms-shadcn` — таргет `eager-jsx-check`,
`dependsOn` у `lint`. Других потребителей на 2026-08-25 нет: баг специфичен местам, где библиотека
экспортирует значения (не только типы) из барреля, исполняемого при обычном статическом импорте —
это класс проблем именно `@letar/forms*`, не общий для всех библиотек монорепо.

### Почему НЕ подключено к `@letar/forms-vue`, `@letar/forms-vue-shadcn`, `@letar/forms-angular`

Проверено 2026-08-25: во всех трёх `.tsx`-файлов нет вообще (Vue — `.vue` SFC + `.ts`-логика,
Angular — только `.ts`, шаблоны inline-строкой или `.html`). Баг специфичен JSX-трансформу
(automatic runtime SWC/Next.js vs classic runtime esbuild под `tsx`) — там, где нет JSX, нет и
самого класса ошибки. Гейт фильтрует по `allowedExtensions: new Set(['.tsx'])`, так что на этих
библиотеках он просто ничего не найдёт — подключение было бы шумом без пользы, не «90% риска за
10% усилий», а 0% риска. Если когда-нибудь появится `.tsx` в этих либах (например, общий
render-хелпер) — тогда и подключать.
