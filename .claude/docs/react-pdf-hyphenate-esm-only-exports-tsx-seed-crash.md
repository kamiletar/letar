# `@react-pdf/hyphenate`: ESM-only `exports` без `require`/`default` роняет `tsx`-скрипты

**Симптом:** `nx db:seed <app>` (любой `tsx`-скрипт, впервые транзитивно импортирующий
`@react-pdf/renderer` — например через `renderToBuffer(<PDF/>)` в сервисном коде) падает:

```
Error [ERR_PACKAGE_PATH_NOT_EXPORTED]: Package subpath './en-us' is not defined by "exports" in
.../node_modules/.../@react-pdf/hyphenate/package.json
```

Стек указывает на внутренний `tsx`-резолвер (`register-*.cjs` → `nextResolveSimple` →
`node:internal/modules/cjs/loader`) — не на код приложения.

## Root cause

`@react-pdf/hyphenate` (транзитивная зависимость `@react-pdf/textkit` → `@react-pdf/renderer`)
объявляет `"type": "module"` и `exports`-карту с **только** условием `"import"` — без
`"require"`/`"default"`:

```json
"exports": {
  ".": { "types": "./lib/index.d.ts", "import": "./lib/index.js" },
  "./*": { "types": "./lib/*.d.ts", "import": "./lib/*.js" }
}
```

`tsx` резолвит специфики (в т.ч. tsconfig `paths`, `@/*`) через собственный хук поверх Node'овского
`Module._findPath` (CJS-резолвер) — причём это происходит **независимо от того, статический
`import` или динамический `import()`** довёл резолюцию до этой точки: сам факт прохода через
tsx-хук путей приводит к CJS-условиям (`node`, `require`, `default`), а `"import"` в их число не
входит. Без `"default"`-фолбэка резолюция подпути (`./en-us` — конкретный язык переносов)
проваливается с `ERR_PACKAGE_PATH_NOT_EXPORTED`.

⚠️ **Проверено эмпирически: замена статического импорта на `await import(...)` НЕ помогает** —
несмотря на то, что динамический импорт обычно уходит через настоящий ESM-резолвер Node, здесь
резолюция всё равно проваливается в тот же CJS-путь через глобальный path-resolution хук `tsx`.
Не тратьте время на этот обходной путь повторно.

Next.js/webpack/Turbopack этой проблемы не имеют — их бандлеры не резолвят `exports` по
require-условиям для внутренних цепочек и/или транспилируют пакет целиком.

## Фикс

Патч `@react-pdf/hyphenate` через существующий bun-patch-механизм репозитория (см. корневой
`package.json` → `patchedDependencies`, `patches/`) — добавить `"default"`-фолбэк рядом с
`"import"` в обоих `exports`-записях, указывающий на тот же ESM-файл. Node 22+ поддерживает
синхронный `require(esm)` для файлов без top-level `await` — как только условие `"default"`
матчится, `hyphenate`'s `./en-us.js` (чистый JS без TLA) загружается штатно.

```bash
bun patch --ignore-scripts "@react-pdf/hyphenate@0.1.0"
# отредактировать node_modules/@react-pdf/hyphenate/package.json — добавить "default" в exports
bun patch --commit 'node_modules/@react-pdf/hyphenate'
```

⚠️ **`bun patch <pkg>` без `--ignore-scripts` в этом репозитории триггерит полный reinstall**,
который на 2026-09-06 падает на несвязанном постинсталл-скрипте `ntsuspend` (нативный модуль,
используемый где-то в дереве зависимостей animatrona, требует сеть/сборку). `--ignore-scripts`
обходит это, не трогая сам механизм патча.

## Смежная проблема на том же пути — `ReferenceError: React is not defined`

После фикса резолюции модуля вскрылась вторая, независимая проблема: сервисный код,
рендерящий PDF (`issueCommercialProposal`/`createContractRevision` и т.п.), использует JSX
(`<EstimateProposalPDF .../>`) без `import React` — под Next.js это штатно (SWC всегда собирает
JSX через automatic runtime, `tsconfig.jsx` не влияет), но `tsx`/esbuild читает
`tsconfig.next-app.json`'s `"jsx": "preserve"` буквально, не понимает `"preserve"` и
транспилирует JSX в **classic** `React.createElement(...)` — без `React` в scope падает.

Тот же класс бага, что в
[letar-forms-lazy-component-eager-jsx-seed-crash.md](letar-forms-lazy-component-eager-jsx-seed-crash.md),
но там причина была в библиотеке (eager JSX на верхнем уровне модуля), а фикс — не создавать
элемент eagerly. Здесь JSX — обычный, внутри функции; фикс библиотечного типа неприменим.

**Фикс — не трогать прикладной код, а изолировать JSX-runtime только для `tsx`-инвокации:**

```json
// prisma/tsconfig.seed.json
{
  "extends": "../tsconfig.json",
  "compilerOptions": { "jsx": "react-jsx" }
}
```

```json
// project.json → targets.db:seed.options.command
"tsx --tsconfig prisma/tsconfig.seed.json prisma/seed.ts"
```

`--tsconfig` — штатный флаг `tsx` (не путать с `TSX_TSCONFIG_PATH`, которого нет). Next.js эту
конфигурацию не видит и не использует — он резолвит собственный `tsconfig.json` по своим
правилам, `"jsx": "preserve"` в проде остаётся нетронутым и работает как раньше (SWC делает
трансформ сам).

## Как проверить, не наступает ли эта же связка где-то ещё

- Любое приложение, чей `tsx`-скрипт (seed, миграционный скрипт) впервые начинает импортировать
  сервис с `renderToBuffer`/JSX внутри — тот же паттерн: сначала `ERR_PACKAGE_PATH_NOT_EXPORTED`
  на `@react-pdf/hyphenate` (если ещё не запатчен глобально через `patchedDependencies` — патч
  общий на монорепо, второй раз патчить не нужно), затем (если файл использует JSX без `import
  React`) `ReferenceError: React is not defined` — чинится через `--tsconfig` с `"jsx":
  "react-jsx"` у конкретного `db:seed`-таргета, не глобально.

## Проверено

- `nx db:seed domwellbes` — три сценария (`prisma/seed/m7-golden-path.ts`, ROADMAP_M7.md §М7A.5)
  проходят полностью, включая рендер и подпись PDF (Proposal + Contract), повторный запуск
  идемпотентен (0 новых строк).
- `nx typecheck:tsgo domwellbes`, `nx lint domwellbes` — зелёные.
