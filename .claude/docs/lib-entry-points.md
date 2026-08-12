# Несколько точек входа в одной библиотеке

Что гарантируют Nx-теги и `@nx/enforce-module-boundaries`, когда одна библиотека несёт и
клиентский React-код, и Node-only серверный, — и чем на самом деле держится граница между ними
на уровне линта. Вторая половина документа — как это резолвится на уровне сборки: что делает
`paths`, при чём тут `node_modules` и почему `transpilePackages` не нужен.

## Как выглядит расхождение

`@letar/image-upload` — React-компоненты загрузки картинок (`src/lib/*.tsx`) плюс серверная
раздача файлов (`src/server/`, `node:fs`/`node:path`/`node:stream`). Обе части живут в одном
Nx-проекте с тегом `type:ui`. Тег как будто врёт: половина библиотеки — не UI.

Это не единичный случай. Все библиотеки монорепо с подпутём-точкой входа под другой рантайм:

| Библиотека            | Подпути `exports`                    | Тег `type:`         |
| --------------------- | ------------------------------------ | ------------------- |
| `@letar/auth`         | `./client`, `./server`               | `type:core`         |
| `@letar/pin-auth`     | `./client`, `./server`, `./email`    | **тега нет вообще** |
| `@letar/cdek`         | `./client` (+ `src/server/`)         | `type:lib`          |
| `@letar/forms`        | `./server-errors`, серверная captcha | `type:ui`           |
| `@letar/image-upload` | `./server`                           | `type:ui`           |

Пять библиотек в одинаковом положении — четыре разных тега и одно отсутствие. **Разметка
монорепо этот случай не различает и никогда не различала.** Тег `image-upload` не «перестал быть
точным» — он никогда не описывал библиотеку целиком.

## Что теги делают на самом деле

Открой `depConstraints` в корневом `eslint.config.mjs`: активные правила используют только
`scope:*` и `owner:*`. Единственное правило на `type:ui` закомментировано ещё до появления этой
ситуации. То есть **`type:*` на библиотеке не влияет ни на что** — это подпись на коробке, не
замок.

Отсюда рабочее соглашение:

> `type:*` описывает **точку входа по умолчанию** (`.`), а не всё содержимое библиотеки.
> Остальные рантаймы объявляются подпутями в `exports` и в README библиотеки.

По этому чтению `type:ui` у `image-upload` корректен: `.` экспортирует React-компоненты и хуки.
Менять его на `type:util`/`type:core` смысла нет — это сделало бы подпись менее информативной, а
проверок всё равно не добавило бы. Заводить отдельный `type:` для «смешанных» библиотек — значит
перетегировать пять проектов ради тега, который ничего не включает.

## Почему `enforce-module-boundaries` тут бессилен

Правило работает на рёбрах **между проектами**. `@letar/image-upload` и
`@letar/image-upload/server` — один и тот же узел графа, у него один набор тегов. Выразить «этому
подпути нельзя» система тегов не умеет в принципе.

Проверено на живых пробниках (обе прошли линт без единой ошибки до правок ниже):

- клиентский компонент приложения (`'use client'`) с `import ... from '@letar/image-upload/server'`;
- `src/lib/*.tsx` внутри самой библиотеки с `import ... from '../server'`.

Единственный способ дать правилу увидеть эту границу — **разнести на два Nx-проекта**. Для
`image-upload` это три файла и одна функция против нового проекта, `paths`+`references` в семи
приложениях и ещё одного `transpilePackages`. Не окупается.

## Чем граница держится сейчас

Два блока `@typescript-eslint/no-restricted-imports` в корневом `eslint.config.mjs`:

| Направление                      | Область                                   | Что запрещено                                    |
| -------------------------------- | ----------------------------------------- | ------------------------------------------------ |
| серверная часть тянет клиентскую | `**/src/server/**`                        | `react`, `react-dom`, `@chakra-ui/react`         |
| клиентская часть тянет серверную | `**/src/client/**`, `**/src/lib/**/*.tsx` | `@letar/*/server`, относительные `../server[/*]` |

`allowTypeImports: true` в обоих: `import type` стирается при компиляции и границу не нарушает.

Соглашение, на которое опираются правила: **`src/server/` — Node-only, `src/client/` — браузер.**
Заводишь в библиотеке серверную точку входа — клади её именно в `src/server/`, иначе защиты не
будет.

### Что осталось не покрытым

Клиентский компонент **приложения**, импортирующий `@letar/x/server`, линтом не ловится:
`'use client'` не выразить в `files`-глобах flat-config, а запрет по маске `**/*.tsx` снёс бы
легальные Server Components. Страховка тут — бандлер: `node:fs` в клиентском бандле Next.js даёт
ошибку сборки. Если этого окажется мало — канонический ответ экосистемы — пакет `server-only`
(`import 'server-only'` в `src/server/index.ts`, падает на этапе сборки клиентского бандла). Пока
не подключён: тянуть зависимость ради гипотетического случая рано.

## ⚠️ Ловушка: `files`-глобы с путём от корня молча не работают

ESLint 10 ищет конфиг **от файла**, а не от cwd. 58 проектов монорепо имеют свой
`eslint.config.mjs` вида:

```js
import baseConfig from '../../eslint.config.mjs'
export default [...baseConfig, { ignores: ['**/out-tsc'] }]
```

Когда корневой массив спредится в такой файл, `files` считаются относительно **него**. Блок с
`files: ['libs/*/src/server/**/*.ts']` в проекте `libs/image-upload` превращается в
`libs/image-upload/libs/*/src/server/**` и не совпадает ни с чем. Ошибки нет — правило просто
не срабатывает.

Симптом: правило ловит нарушение в библиотеке **без** своего конфига (`libs/auth`) и молчит в
соседней **со** своим (`libs/image-upload`). Диагностика — `eslint --print-config <файл>`: нужного
правила в выводе просто нет.

Поэтому любой новый блок в корневом `eslint.config.mjs` пишем через `**/`:
`**/src/server/**/*.ts`, а не `libs/*/src/server/**/*.ts`. До сих пор это не всплывало только
потому, что все существующие блоки используют глобы вида `**/*.ts` без привязки к каталогу.

Обратная сторона `**/`: глоб цепляет и приложения. Поэтому запрет сформулирован узко —
`@letar/*/server` и относительные `../server`, а не `**/server`. Голый `**/server` поймал бы
`next-intl/server` и `@/types/server`, которых в репо сотни.

## ⚠️ Вторая ловушка: `@nx/eslint:lint` меняет cwd — `ignores` резолвится не от файла

Зеркальный случай к ловушке выше, только с `ignores` вместо `files` и с другой причиной.

[apps/form-docs/eslint.config.mjs](/apps/form-docs/eslint.config.mjs) игнорирует генерируемые
Fumadocs-файлы (`src/.source/*.ts` — `@ts-nocheck`, `{}`-типы, всё равно перезаписывается при
каждом `next dev`/`next build`):

```js
export default [
  ...baseConfig,
  { ignores: ['.source/**', '.next/**', '**/out-tsc'] },
]
```

Прямой `bunx eslint .`, запущенный из `apps/form-docs`, это уважает — `.source/**` резолвится
относительно cwd, который совпадает с каталогом конфига. `nx run form-docs:lint` — нет: `.source`
линтится как обычный код, падает на `@typescript-eslint/ban-ts-comment` и
`no-empty-object-type` (2026-08-05, [PLAN_COMPLETED.md](/apps/form-docs/PLAN_COMPLETED.md)).

**Причина — не resolve конфига (это чинит `findFlatConfigFile`, см. код `@nx/eslint:lint`
executor'а), а cwd.** `lint.impl.js` делает `process.chdir(systemRoot)` — переключает cwd на
корень workspace **до** инстанцирования `ESLint`, специально чтобы `lintFilePatterns` из
`project.json` резолвились предсказуемо с любого места запуска. Побочный эффект: `ignores`
(в отличие от `files`, для которых нужен отдельный конфиг-файл) в этой версии ESLint 10 берёт
базовый путь от `cwd` инстанса, а не от каталога `overrideConfigFile` — проверено напрямую
`new ESLint({ overrideConfigFile: '.../form-docs/eslint.config.mjs', cwd: <root> })` даёт те же
незаигноренные файлы, что и `nx run`; тот же вызов с `cwd: <resolve('apps/form-docs')>` их
убирает.

Починка — писать `ignores` путём **от корня workspace**, а не от каталога проекта:

```js
ignores: ;
;['apps/form-docs/.source/**', 'apps/form-docs/.next/**', '**/out-tsc']
```

Симптом почти неотличим от предыдущей ловушки (`ignores`, знакомый по прямому запуску, тихо не
срабатывает через `nx lint`) — но лечится противоположно: там глоб просили писать `**/`-независимым
от каталога, здесь ровно наоборот, привязывать к каталогу проекта явным путём от корня. Диагностика
та же: если `bunx eslint .` из каталога проекта ведёт себя иначе, чем `nx run <project>:lint` —
подозревать резолв путей, а не сам список правил.

## Как это резолвится на уровне сборки

Governance (теги, `no-restricted-imports`) — выше. Здесь — что конкретно резолвит специфер
`@letar/x/server` при `nx build`/`nx typecheck:tsgo`, что ломается при промахе и почему
`transpilePackages` тут не нужен. Разобрано на `@letar/image-upload` — единственной библиотеке
с подпутём, у которой семь потребителей сразу, что даёт статистику вместо одного примера.

### `exports` в package.json библиотеки

[libs/image-upload/package.json](/libs/image-upload/package.json):

```json
{
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": {
    ".": { "types": "./src/index.ts", "import": "./src/index.ts", "default": "./src/index.ts" },
    "./server": {
      "types": "./src/server/index.ts",
      "import": "./src/server/index.ts",
      "default": "./src/server/index.ts"
    },
    "./package.json": "./package.json"
  }
}
```

`main`/`types` описывают только `.` — подпуть обязан быть отдельным ключом в `exports`.

### `paths` в tsconfig КАЖДОГО приложения — отдельно на подпуть

⚠️ Ключ `@letar/image-upload` **не покрывает** `@letar/image-upload/server`: `paths` матчится по
строке, а не по префиксу пакета.

```json
"@letar/image-upload": ["../../libs/image-upload/src/index.ts"],
"@letar/image-upload/server": ["../../libs/image-upload/src/server/index.ts"]
```

| Приложение   | Что прописано                                                           |
| ------------ | ----------------------------------------------------------------------- |
| mandala      | оба входа — [tsconfig.json:35-36](/apps/mandala/tsconfig.json)          |
| kami         | только серверный — [tsconfig.json:32](/apps/kami/tsconfig.json)         |
| grandslamcup | только серверный — [tsconfig.json:32](/apps/grandslamcup/tsconfig.json) |

Приложение может быть потребителем **только** серверного входа: у `kami` и `grandslamcup` записи
для `.` нет вообще — библиотека нужна им исключительно ради `createUploadsRoute` в
`api/files/[...path]/route.ts`. Это законная конфигурация, не недоделка.

Промах в `paths` даёт `error TS2307: Cannot find module '@letar/image-upload/server'` — проверено
сравнением двух конфигов `tsgo` на одном файле-импортёре: с записью резолв уходит внутрь
`libs/image-upload/src/server/serve-uploads.ts`, без записи — TS2307 на строке импорта.

⚠️ У `kami` и `grandslamcup` в `next.config` стоит `typescript.ignoreBuildErrors: true`, поэтому
TS2307 **в билде не всплывёт** — промах ловит только `nx typecheck:tsgo <app>`.

### Почему `paths` — несущая конструкция, а не удобство

В корне монорепо **нет `node_modules/@letar`** — ни каталога, ни симлинков (`lstat` → `ENOENT`).
Bun линкует workspace-библиотеки в `apps/<app>/node_modules/@letar/` только для объявленных в
`dependencies` самого приложения:

```bash
ls apps/studio/node_modules/@letar      # hooks
ls apps/dashboard/node_modules/@letar   # analytics chakra-provider forms infra-config ui
ls apps/kami/node_modules/@letar        # пусто
```

Все семь потребителей `image-upload` (`aboi`, `aprel8008`, `domwellbes`, `driving-school`,
`grandslamcup`, `kami`, `mandala`) объявляют `@letar/*` через `nx.implicitDependencies` — это граф
Nx, а не установка пакета. Линка не появляется, поэтому **`paths` остаётся единственным
механизмом резолва**.

Обратная сторона: у `studio` импорт `@letar/hooks` работает вообще без записи в `paths` (либа в
`dependencies` → линк есть), и `nx typecheck:tsgo studio` зелёный. Не бери это за образец — при
`implicitDependencies` так не будет.

### `transpilePackages` — НЕ нужен

Для библиотеки, резолвящейся через `paths`, запись в `transpilePackages` не требуется.

⚡ **Итог массовой проверки 2026-08-05: опция снята во всех приложениях монорепо.** Ниже —
рассуждение и первые доказательства, в конце раздела — «Сплошная проверка» с результатами по
всем 20 конфигам. Если пишешь новый `next.config.*`, `@letar/*` туда просто не добавляй.

- [apps/kami/next.config.js:36](/apps/kami/next.config.js) перечисляет пять пакетов, и
  `@letar/image-upload` среди них нет — при том что `src/app/api/files/[...path]/route.ts`
  импортирует `@letar/image-upload/server`. `nx build kami` доходит до `✓ Compiled successfully`
  — а это ровно та фаза, где вылез бы `Module not found`. Turbopack в трейсе прямо показывает,
  что затянул исходник библиотеки:

  ```
  Import trace:
    App Route:
      ./libs/image-upload/src/server/serve-uploads.ts
      ./apps/kami/src/app/api/files/[...path]/route.ts
  ```

- [apps/grandslamcup/next.config.mjs](/apps/grandslamcup/next.config.mjs) не имеет
  `transpilePackages` вовсе, хотя тянет `@letar/forms`, `@letar/ui`, `@letar/auth`,
  `@letar/chakra-provider` и серверный вход `image-upload`. `nx build grandslamcup` тоже доходит
  до `✓ Compiled successfully`. То же отсутствие `transpilePackages` — у `aprel8008`,
  `dsperevod`, `studio`.

Важно, что эти два случая закрывают **оба бандлера**: `kami` собирается Turbopack'ом,
`grandslamcup` — webpack'ом (`next build --webpack`). Правило «не компилировать `node_modules`»,
которое снимает `transpilePackages`, — исторически webpack'овое, так что webpack-подтверждение
здесь весомее.

⚠️ Целиком локально ни тот, ни другой билд не проходит — но оба падают **позже** фазы компиляции
и по причинам, не связанным с резолвом библиотек: `kami` — на `/api/keystatic/[...params]` без
`KEYSTATIC_*` (они только в `.env.docker`, а локальный `next build` грузит `.env.local`/`.env`),
`grandslamcup` — на «Collecting page data» без доступа к БД (`EACCES` при `acquireConnection`).
Для вопроса про `transpilePackages` это неважно: `Module not found` вылезает на фазе компиляции,
а она в обоих случаях зелёная.

#### Проверка обратным ходом: `@letar/redis-client` (2026-08-05)

Оба примера выше — наблюдения «записи нет, и всё работает». Прямая проверка с другой стороны
(запись **была**, убрали — сломается?) сделана на `@letar/redis-client`: у обоих его
Next.js-потребителей `output: 'standalone'`, оба подключают библиотеку через
`implicitDependencies` + `paths` и оба держали её в `transpilePackages`.

| Приложение           | Бандлер                          | `nx build` без записи | Что ещё сверено                                                                                                                                           |
| -------------------- | -------------------------------- | --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `animatrona-tracker` | webpack (`next build --webpack`) | зелёный, 3м32с        | код библиотеки — в тех же 19 серверных чанках (список файлов с `REDIS_URL` в `.next/server` совпал с baseline), `.next/standalone/node_modules` идентичен |
| `svoichuzhie`        | Turbopack (`next build`)         | зелёный, 50.6с        | —                                                                                                                                                         |

Обе сборки доходят не только до `✓ Compiled successfully`, но до конца (prerender + запись
`.next/standalone`) — в отличие от `kami`/`grandslamcup` выше, где зелёной была только компиляция.
Записи `@letar/redis-client` в `transpilePackages` обоих приложений оставлены как есть: они
безвредны, но не обязательны — воспроизводить их в новых приложениях не нужно.

**Причина.** `transpilePackages` снимает дефолтное правило Next.js «не компилировать то, что лежит
в `node_modules`». Через `paths` специфер резолвится сразу в исходник под `libs/` — файл вне
`node_modules`, который Next компилирует как обычный файл проекта. Снимать нечего.

То же говорит Nx в деприкейшен-предупреждении, которое печатается при каждом билде:

> `withNx()` from `@nx/next` is deprecated… Next.js transpiles workspace libraries automatically.

⚠️ Уточнение к прецеденту из [deploy-coordination.md](/.claude/rules/deploy-coordination.md)
(«typecheck зелёный, прод-билд падает на `Module not found`» при транзитивном реэкспорте одной
`@letar/*`-либы из другой): чинится он добавлением **`paths`** для транзитивной библиотеки, а не
`transpilePackages`. Показательно, что `aprel8008` имеет `@letar/format-utils` в `paths` и не имеет
`transpilePackages` вовсе. Сам совет «прогони `nx build <app>` после нового импорта из `libs/`»
остаётся в силе — меняется только то, что чинить по факту падения.

### `transpilePackages` ≠ `outputFileTracingIncludes`

Частая подмена: проблему `output: 'standalone'` пробуют лечить `transpilePackages`. Это разные
этапы сборки, и первый до второго не дотягивается.

| Опция                       | Этап                         | Что делает                                                                         |
| --------------------------- | ---------------------------- | ---------------------------------------------------------------------------------- |
| `transpilePackages`         | компиляция                   | снимает запрет «не компилировать то, что лежит в `node_modules`»                   |
| `outputFileTracingIncludes` | трассировка после компиляции | форсирует копирование файлов в `.next/standalone`, которые не увидел `@vercel/nft` |

Симптомы тоже разные. Нехватка `transpilePackages` валит **сборку** на фазе компиляции
(`Module not found`) — это ловит `nx build <app>`. Баг трассировки виден только **в рантайме
контейнера** (`ERR_DLOPEN_FAILED`, `Cannot find module` на первом же запросе) при полностью
зелёном билде — про него [nextjs-standalone-tracing.md](/.claude/docs/nextjs-standalone-tracing.md),
и лечится он `outputFileTracingIncludes`. `transpilePackages` в том документе не фигурирует
вообще — на standalone-вывод он не влияет: у `animatrona-tracker` содержимое `.next/standalone`
от удаления записи не изменилось (проверка выше).

### Сплошная проверка: опция снята везде (2026-08-05)

Разделы выше доказывали «не нужен» на отдельных примерах. Здесь — сплошной проход: `@letar/*`
убраны из **всех** конфигов монорепо, где они были, и каждое приложение собрано.

| Группа                  | Приложения                                                                                                                                                                          | Результат                                                                       |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Публичные web (13)      | `aira-web`, `animatrona-landing`, `animatrona-tracker`, `archetest`, `auth-hub`, `dashboard`, `kami`, `kami-key-the-landing`, `letar-landing`, `mandala`, `pravda`, `synth`, `time` | 13/13 `✓ Compiled successfully`, ни одного `Module not found`                   |
| Приватные submodule (4) | `aboi`, `domwellbes`, `driving-school`, `svoichuzhie`                                                                                                                               | 4/4 скомпилировались; три из них — полностью зелёный билд                       |
| Electron-renderer (3)   | `animatrona`, `label-printer-desktop`, `poster-microtext-desktop`                                                                                                                   | `animatrona` — полный зелёный билд; двое падают одинаково до и после (см. ниже) |

Покрыты оба бандлера: `animatrona-tracker`, `dashboard`, `driving-school` собираются webpack'ом,
остальные — Turbopack'ом. Шаблон генератора `electron-app` тоже почищен, чтобы новые десктопные
приложения не рождались с этой записью (шаблон `new-app` её и не имел).

⚠️ **Что осталось в `transpilePackages` намеренно:** в
[apps/animatrona/renderer/next.config.js](/apps/animatrona/renderer/next.config.js) — `@libsql/*`
и `@prisma/adapter-libsql`/`driver-adapter-utils`/`debug`. Это не workspace-библиотеки, а
настоящие пакеты из `node_modules`, которым нужен принудительный бандлинг вместо экстернализации
(иначе Turbopack собирает внешние модули с битыми ESM-зависимостями `node-fetch` → `fetch-blob`).
Правило «`@letar/*` не нужны» на них не распространяется.

**Приложения, чей билд не проходит локально по причинам, не связанным с этой правкой** — для
каждого сделана сверка «исходный конфиг из `git HEAD` → та же ошибка»:

| Приложение                          | Где падает             | Причина                                                                                                                                     |
| ----------------------------------- | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `synth`                             | `Running TypeScript`   | `TS6305` на `out-tsc/spec/vitest.config.d.ts` (project references)                                                                          |
| `auth-hub`, `aboi`                  | `Collecting page data` | роуты Better Auth требуют env, которых нет в локальном `.env.local`                                                                         |
| `label-printer-desktop/renderer`    | компиляция             | несгенерированные `src/generated/form-schemas` и `../../schema`                                                                             |
| `poster-microtext-desktop/renderer` | резолв самого `next`   | `turbopack.root` в submodule со своим `.git` — см. [turbopack-private-submodule-root.md](/.claude/docs/turbopack-private-submodule-root.md) |

⚠️ **Методическая ловушка этой проверки: `.next` от предыдущей сборки даёт ложный зелёный.**
`label-printer-desktop/renderer` в первом прогоне отчитался `✓ Compiled successfully in 1815ms` —
1.8 секунды на приложение, которое с чистого кэша не компилируется вовсе. Сверять два конфига
можно только с `rm -rf .next` перед каждым запуском; аномально быстрая сборка — сигнал, что
сравниваешь кэш, а не код.

## Заводишь библиотеку со второй точкой входа — чек-лист

1. Серверный код — в `src/server/`, клиентский — в `src/client/` или `src/lib/`.
2. Подпуть в `exports` библиотечного `package.json` (образец — `@letar/auth`).
3. `paths` в `tsconfig.json` каждого приложения-потребителя **на подпуть отдельно**:
   `"@letar/x/server": ["../../libs/x/src/server/index.ts"]`.
4. `references` в `tsconfig.json` приложения — **не обязательны** (их читает только `tsc --build`,
   которого у приложений нет). Если ставишь — на библиотеку целиком, одна на все подпути
   (`{ "path": "../../libs/x" }`), и **руками**: `nx sync` в этом репо отключён.
5. `nx.implicitDependencies` в `package.json` приложения — для графа Nx.
6. `transpilePackages` — **не добавлять**: библиотеке, резолвящейся через `paths`, он не нужен —
   в том числе при `output: 'standalone'` (проверка на `@letar/redis-client` выше). Проблемы
   standalone-вывода лечит `outputFileTracingIncludes`, а не эта опция.
7. Раздел про серверную часть в README библиотеки — тег `type:*` про неё не расскажет.
8. Тег не трогаем: он про `.`.

Промах в п.3 ловит `nx typecheck:tsgo <app>` (может быть замаскирован `ignoreBuildErrors`),
промах в п.2 — `nx build <app>`.

## Проверено на остальных четырёх библиотеках (2026-08-04)

`image-upload` был первым — ниже результат прогона `bunx eslint <lib>/src` (и глазами по структуре
`src/`) на оставшихся четырёх из таблицы выше.

| Библиотека | `no-restricted-imports` нарушений | Структура                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| ---------- | --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `auth`     | 0                                 | Чисто: `src/server/`, `src/client/` — оба глоба ловят всё содержимое.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `pin-auth` | 0                                 | Чисто: `src/server/`, `src/client/`, плюс `src/email/` (изоморфные шаблоны без импортов) и `src/schemas/` (только `zod`). Тега `type:*` не было вообще — добавлен `type:core` (см. ниже).                                                                                                                                                                                                                                                                                                                                                                                                |
| `cdek`     | 0 (до правки — не покрывалось)    | **Была дыра**: `./client` — не папка `src/client/`, а один файл `src/client.ts`, реэкспортирующий `src/ui/*.tsx`. Ни `**/src/client/**`, ни `**/src/lib/**/*.tsx` его не ловили — правило молчало бы даже на живой импорт `react`/`../server` в этих файлах. Почищено ниже.                                                                                                                                                                                                                                                                                                              |
| `forms`    | 0                                 | **Известный, не почищенный зазор**: серверная captcha (`src/lib/captcha/verify.ts`) и `src/lib/server-errors/*` лежат не в `src/server/`, а в `src/lib/`. Оба правила их не видят вообще (не `src/server/`, и это `.ts`, а не `.tsx`, так что второй глоб `**/src/lib/**/*.tsx` тоже мимо). Сейчас нарушений нет (`verify.ts`/`server-errors` не тянут React), поэтому не трогаем — переезд в `src/server/` сломал бы `./server-errors` в `exports` и пример из JSDoc (`@letar/forms/captcha/server`), это отдельная задача с более широким блэст-радиусом, не входит в проверку границ. |

### Правка: `cdek` — добавлены два глоба под клиентское правило

`eslint.config.mjs` (блок «клиентская часть тянет серверную», строки ~132-138) расширен:

```js
files: [
  '**/src/client/**/*.ts',
  '**/src/client/**/*.tsx',
  '**/src/client.ts', // ← новое: одиночный файл-точка входа (cdek)
  '**/src/lib/**/*.tsx',
  '**/src/ui/**/*.tsx', // ← новое: cdek держит клиентские компоненты в src/ui/, не src/lib/
],
```

Проверено `eslint --print-config libs/cdek/src/client.ts` и
`eslint --print-config libs/cdek/src/ui/pvz-picker.tsx` — правило `no-restricted-imports` с
запретом `@letar/*/server`/`../server` теперь в конфиге обоих файлов. `libs/cdek/eslint.config.mjs`
(свой конфиг проекта) — просто `[...baseConfig, { ignores: ['**/out-tsc'] }]`, ловушка из раздела
выше («`files`-глобы с путём от корня») тут не в игре: новые глобы уже начинаются с `**/`.

### Правка: `pin-auth` — добавлен тег `type:core`

`libs/pin-auth/project.json` тегов не имел вообще (`type:*` отсутствовал). Добавлен `type:core` —
по аналогии с `@letar/auth`, ближайшим структурным аналогом (тот же паттерн `./server` + `./client`

- доп. точки входа). Безопасно: единственное правило `depConstraints`, ссылающееся на `type:*`,
  закомментировано (см. «Что теги делают на самом деле» выше) — тег ничего не блокирует, только
  документирует точку входа `.`.

## Скрипт `scripts/add-lib-tsconfig-path.mjs` — массовая правка `paths` в apps/*/tsconfig.json

Заводишь новый subpath у библиотеки с несколькими точками входа (см. чек-лист выше, п.3) —
строку `paths` нужно добавить в **каждый** `apps/*/tsconfig.json`-потребитель библиотеки-якоря
(`@letar/forms` даёт ~19 приложений, включая `apps/animatrona/renderer` и
`apps/label-printer-desktop/renderer`, которые на уровень глубже и поэтому получают
`../../../` вместо `../../`). Делать это руками одноразовым скриптом под каждый новый subpath —
источник ошибок: сессия расслоения `libs/forms` → `libs/forms-core` (Фаза 7.1, Этапы 1/3а,
[libs/forms/PLAN.md](/libs/forms/PLAN.md)) проходила через это четыре раза подряд, каждый раз с
ручным подбором relative-prefix.

```bash
node scripts/add-lib-tsconfig-path.mjs \
  --package "@letar/forms-core/security" \
  --target "libs/forms-core/src/lib/security/index.ts" \
  --after "@letar/forms-core/utils"
```

- `--package` — ключ `paths`, который нужно добавить.
- `--target` — путь к файлу-цели **от корня репозитория**; relative-prefix (`../../` vs
  `../../../`) скрипт вычисляет сам по фактическому расположению каждого `tsconfig.json`, не
  принимает его аргументом — это и было главным источником ошибок в ручном режиме.
- `--after` (опционально) — существующий ключ `paths`, после которого вставить новую строку,
  для читаемого порядка. Не найден или не передан — строка уйдёт в конец объекта `paths`.
- `--anchor-package` (опционально, по умолчанию `@letar/forms`) — какой существующий ключ
  считать признаком «это приложение — потребитель»; полезно для библиотеки, не относящейся
  к forms.

Приложения-потребители находятся автоматически (`apps/*/tsconfig.json` и вложенные
`apps/*/*/tsconfig.json` — `renderer/`, `main/` и т.п.), без явного списка. Идемпотентен:
повторный запуск с тем же `--package` пропускает файлы, где ключ уже есть. Каждый изменённый
файл валидируется `JSON.parse` после правки; список файлов, где anchor-ключ есть, но блок
`paths` не распознан (не должно случаться в норме) — печатается отдельно, чтобы не потерять
пропуск молча.

## Перенос физического пути СУЩЕСТВУЮЩЕГО подпути — решено не автоматизировать (2026-08-12)

Отдельный сценарий от чек-листа выше: не добавление нового ключа `paths`, а смена **значения**
уже существующего ключа во всех `apps/*/tsconfig.json`-потребителях — когда физическое
расположение файлов подпути меняется, а имя экспорта (`@letar/forms/server-errors`) остаётся
прежним. Ровно это произошло при переносе `src/lib/server-errors/*` → `src/server/server-errors/*`
в `@letar/forms` (границы `no-restricted-imports`, зазор был описан в §35 `PLAN.md`, закрыт
коммитами `45b00ade`/`2c30cf93`): 19 `tsconfig.json` (13 публичных приложений — batch `sed`, 6
приватных submodule — `aboi`/`domwellbes`/`driving-school`/`dsperevod`/`studio`/`svoichuzhie` —
руками, отдельным коммитом в каждый).

**Решение: генератор/скрипт под это не заводить.** Причины:

- Проверено по `git log --all` — это **первый и единственный** случай такого переноса за всю
  историю репозитория. `@letar/auth` (`src/server/`+`src/client/`) и `@letar/cdek`
  (`client.ts`) получили свою структуру подпутей ещё в момент создания библиотеки (`initial
  commit`), это не миграция существующего пути, а изначальный дизайн.
- Смежный, более частый сценарий (добавление **нового** ключа `paths` для нового подпути) уже
  закрыт `scripts/add-lib-tsconfig-path.mjs` (см. выше) — он не подходит для смены значения
  существующего ключа, но и решаемая им проблема возникает не так редко.
- Ручной `sed` по 13 публичным `tsconfig.json` занял разумное время; отдельного инструмента ради
  события раз в несколько месяцев дороже, чем разовая правка.

Если событие повторится ещё раз — тогда есть смысл обобщить `add-lib-tsconfig-path.mjs` до
режима «заменить значение существующего ключа» (флаг `--replace-target` вместо `--after`), а не
писать новый скрипт с нуля.

## Ссылки

- `libs/image-upload/README.md` § «Серверная часть» — сам API `createUploadsRoute`.
- `PLAN.md` §29, §33 — зачем серверную раздачу вообще вынесли в библиотеку и разбор резолва.
- [libs.md](/.claude/rules/libs.md) — общие правила библиотек.
