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
выключаются разом. Ни магические комментарии, ни глобальная правка парсера не нужны. Но забирать
его из результата импорта нужно **через `default`**, иначе получишь третье, ещё более тихое
падение (разбор ниже):

```ts
const nodeModule = await import('node:module')
const createRequire = nodeModule.createRequire ?? nodeModule.default.createRequire
const dir = path.dirname(
  createRequire(import.meta.url).resolve(/* turbopackIgnore: true */ 'web-ifc/web-ifc-node.wasm'),
)
```

`/* turbopackIgnore: true */` остаётся для dev-сборки (она по-прежнему на Turbopack) — там
проблема другая и лечится именно комментарием.

### ⚠️ Третий способ: деструктуризация `await import('node:module')` даёт `undefined`

Первая редакция фикса выглядела естественно — и молча не работала в прод-сборке:

```ts
const { createRequire } = await import('node:module') // ← createRequire === undefined
```

`await import()` webpack собирает в `__webpack_require__.t(id, 23)` — построение ES-namespace из
значения CommonJS-модуля. Свойства значения переносятся в namespace циклом, который выполняется,
**только пока значение — объект**:

```js
for (
  var current = mode & 2 && value;
  typeof current == 'object' && !~leafPrototypes.indexOf(current);
  current = getProto(current)
) {
  Object.getOwnPropertyNames(current).forEach((key) => def[key] = () => value[key])
}
def['default'] = () => value
```

`require('node:module')` возвращает **функцию** `Module`, а не объект. Цикл не выполняется ни
разу, и в namespace попадает один `default`. Проверка эмуляцией рантайма webpack:

```
ключи namespace: default
ns.createRequire: undefined
ns.default.createRequire: function
```

Дальше всё тихо: сборка зелёная, typecheck зелёный (типы описывают настоящий ESM, а не то, что
соберёт бандлер), dev на Turbopack работает — он строит namespace иначе. В проде минифицированный
чанк падает `TypeError: d is not a function` — без имени модуля, без файла, а если вызов сидит в
фоновой задаче, то и без стека в stdout. Ловится только живым прогоном сценария.

`default` ведёт к тому же `Module` и под webpack, и под настоящим ESM Node.js (там `default` CJS-
модуля — сам `module.exports`), а `createRequire` у него статический метод. Поэтому порядок
`named ?? default.` работает в обеих средах.

То же касается **любого** встроенного модуля, чей `module.exports` — функция, а не объект.
Классические `node:path`, `node:fs`, `node:url` — объекты, их деструктуризация безопасна;
`node:module` — исключение, которое выглядит ровно как они.

Готовая обёртка (`createNodeRequire()`, с явным `TypeError` вместо «X is not a function», если
бандлер снова сломает namespace) — `apps/domwellbes/src/lib/node-require.ts`.

### ⚠️ Четвёртый способ: `import.meta.url` заинлайнен на машине сборки

Живой прогон на стенде сразу после починки третьего способа дал следующую ошибку — уже громкую,
но с обманчивым `Require stack`:

```
Error: Cannot find module 'web-ifc/web-ifc-node.wasm'
Require stack:
- /home/deploy/letar/apps/domwellbes/src/lib/ifc/web-ifc.ts
```

Файла по этому пути нет **ни у кого**: это путь исходника на машине, которая собирала образ, а
приложение живёт в `/app`. `import.meta.url` вычисляется при сборке и попадает в чанк строкой,
поэтому `createRequire(import.meta.url)` строит резолвер, который ищет `node_modules` вверх от
`/home/deploy/...`. Ошибки при создании не будет — `createRequire()` не проверяет существование
файла, — падает только сам резолв, и стек показывает путь, которого на этой машине не бывает.

Рабочая база — `process.cwd()`: в standalone это каталог приложения (`/app/apps/domwellbes`), в
dev — `apps/domwellbes`, и в обоих случаях подъём по `node_modules` доходит до настоящих пакетов.
`import.meta.url` стоит оставить запасным: он верен там, где код исполняется из исходников
(vitest, `tsx`, `next dev`). Обе базы пробуются в `resolvePackageFile()` — каждая целиком, вместе
с созданием `require`: на Windows `createRequire('file:///home/deploy/…')` бросает
`ERR_INVALID_ARG_VALUE` **до** резолва, на linux та же строка проходит и падает позже.

⚠️ Ни один статический гейт этого не ловит: путь в чанке выглядит совершенно законно, а
`check-standalone-runtime-files.mjs` резолвит **своим** `createRequire` от каталога чанков —
внутри standalone любая база сходится к одному и тому же `node_modules`. Расхождение видно только
там, где база указывает наружу standalone, то есть в контейнере на живом прогоне.

### Когда `createRequire` не нужен вовсе

Если резолвится **сам пакет**, а не файл внутри него, статический `createRequire` не проблема, а
лишняя сложность: webpack распознает его и просто забандлит пакет
(`require('fontkit')` → `c(231560)` в чанке прод-сборки). Рантайм-резолва нет, строки `fontkit`
в бандле тоже нет, `outputFileTracingIncludes` не нужен. Обёртка здесь ничего не даёт — см.
`src/lib/ifc/glyph-text.ts`. Граница простая: **файл внутри пакета — обёртка, пакет целиком —
обычный импорт**.

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

Третий способ (деструктуризация namespace) нашёлся там же четырьмя днями позже, 2026-09-22, уже
на развёрнутом стенде: сборка 3D-модели дома падала `TypeError: d is not a function` в
`withIfcModel`.

⚠️ Локальная прод-сборка (`next build --webpack` + `next start`) ту же модель при этом собирала
целиком — запись в БД с настоящей геометрией (6354 треугольника, 36 648 байт GLB), не переиспользование
прошлого результата. **Расхождение осталось необъяснённым**: форма namespace от версии Node не
зависит (проверено эмуляцией рантайма на обеих), а локальная сборка к моменту разбора была
затёрта dev-сервером. Единственное замеченное отличие — в контейнере модуль `node:module`
(`598995`) зарегистрирован только в entry-бандлах (`instrumentation.js`, `app/**/page.js`) и ни в
одном `chunks/*.js`. Практический вывод для следующего раза тот же, что дала эта история: зелёный
локальный прогон прод-сборки **не** закрывает вопрос, закрывает только живой прогон на стенде —
[prod-build-runtime-diagnosis-ladder](/.claude/docs/prod-build-runtime-diagnosis-ladder.md).
