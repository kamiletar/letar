# Webpack обнуляет `createRequire()` в `undefined`, а `webpackIgnore` половину проблемы не чинит

## Симптом

Код резолвит путь к файлу внутри пакета через `createRequire`, чтобы получить **реальный путь на
диске** (а не забандленный модуль) — типовой приём для нативных `.wasm`, шрифтов, `standard_fonts`
и прочих ассетов, которые библиотека грузит сама:

```ts
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const dir = path.dirname(require.resolve('web-ifc/web-ifc-node.wasm'))
```

Под `next build --webpack` это ломается двумя разными способами подряд, причём второй тише
первого:

1. **Громко:** цель резолва утягивается в граф модулей и парсится как JS —
   ```
   Module parse failed: Unexpected character ' ' (1:0)
   The module seem to be a WebAssembly module, but module is not flagged as WebAssembly module
   Import trace: node_modules/.bun/web-ifc@0.0.77/node_modules/web-ifc/web-ifc-node.wasm
   ```
   Для `.json`-цели (`pdfjs-dist/package.json`) ошибки не будет вовсе — webpack просто подменит
   результат резолва своим числовым module id, и `path.dirname()` упадёт «Received type number»
   уже в рантайме, при первом реальном обращении.

2. **Тихо, и это ловушка:** если заглушить первое магическим комментарием, сборка становится
   зелёной, а в рантайме падает `TypeError: Cannot read properties of undefined (reading
   'resolve')`.

## Причина

Два независимых механизма webpack, и гасить надо оба.

`parser.javascript.createRequire` включён по умолчанию для `target: node`
(`webpack/lib/config/defaults.js`: `D(parserOptions, "createRequire", isNode)`), поэтому
`CreateRequireParserPlugin` разбирает конструкцию целиком:

- `preDeclarator` ловит объявление `const <имя> = createRequire(<аргумент>)` и **тегирует
  переменную** — имя роли не играет, переименование в `nodeRequire` не помогает;
- `callMemberChain` на этом теге разбирает `.resolve()` так же, как на глобальном `require`;
- `hooks.expression`/`hooks.call` для самого идентификатора `createRequire` заменяют его на
  `/* createRequire() */ undefined` — плагин исходит из того, что раз он забрал себе все
  `.resolve()`, сама фабрика в рантайме уже не нужна.

`/* webpackIgnore: true */` внутри `require.resolve()` при этом:

- **не читается вовсе**, пока не включён `parser.javascript.commonjsMagicComments` — опция в
  дефолтах не выставляется, а проверка комментария в `createProcessResolveHandler`
  (`CommonJsImportsParserPlugin`) стоит именно за ней. Это объясняет, почему комментарий,
  скопированный по аналогии с рабочим `turbopackIgnore`, выглядит проигнорированным;
- включив опцию, комментарий запрещает webpack трогать **только сам вызов** `.resolve()`.
  Переписывание объявления переменной в `undefined` делает другой хук, комментарий на него не
  влияет — отсюда зелёная сборка с `undefined.resolve(...)` внутри.

Проверено на webpack 5.111 изолированной сборкой (`mode: 'none'`, `target: 'node'`):

| конфигурация                                        | `.wasm` в графе | `createRequire` в бандле       |
| --------------------------------------------------- | --------------- | ------------------------------ |
| дефолты                                             | да → ошибка     | —                              |
| `commonjsMagicComments: true` + `webpackIgnore`     | нет             | `undefined` → падение рантайма |
| `createRequire: false` + `webpackIgnore`            | нет             | живой                          |
| динамический `await import('node:module')`, дефолты | нет             | живой                          |

## Фикс

Брать `createRequire` динамическим импортом — статический анализ его не видит, и оба механизма
выключаются разом. Ни магические комментарии, ни глобальная правка парсера не нужны:

```ts
const { createRequire } = await import('node:module')
const dir = path.dirname(
  createRequire(import.meta.url).resolve(/* turbopackIgnore: true */ 'web-ifc/web-ifc-node.wasm'),
)
```

`/* turbopackIgnore: true */` остаётся для dev-сборки (она по-прежнему на Turbopack) — там
проблема другая и лечится именно комментарием.

Второй рабочий вариант — `config.module.parser.javascript.createRequire = false` в
`next.config.mjs`, но он действует на **весь граф**, включая `node_modules`: библиотека, которая
рассчитывает, что webpack забандлит цель её `createRequire().resolve()`, начнёт резолвить в
рантайме и может не найти файл в standalone-выводе. Динамический импорт точечный, радиус —
только свой файл.

## Не путать с

- [webpack-emscripten-runtime-wasm-not-emitted](/.claude/docs/webpack-emscripten-runtime-wasm-not-emitted.md)
  — там webpack, наоборот, **не замечает** runtime-путь и не копирует `.wasm` в вывод; лечится
  копированием через `afterEmit`. Здесь обратное: замечает слишком хорошо. Одно приложение может
  словить обе проблемы сразу.
- `serverExternalPackages` — покрывает **голый специфайр** пакета (`"web-ifc"`), но не подпуть
  (`web-ifc/web-ifc-node.wasm`), поэтому на этот класс ошибок не влияет.

## Где встретилось

`apps/domwellbes`, перевод прод-сборки с Turbopack на webpack ради Serwist (офлайн-приёмка,
`PLAN_PROCUREMENT.md` §8.5.3) — два места: `src/lib/ifc/web-ifc.ts` (`web-ifc`, громкое падение
сборки) и `src/lib/drawings/pdf-text.ts` (`pdfjs-dist`, тихая подмена резолва). Второе нашлось
только грепом по `require.resolve(` — само по себе оно сборку не роняет.
