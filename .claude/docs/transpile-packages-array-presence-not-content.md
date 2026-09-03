# `transpilePackages`: у Next-сборки монорепо работает наличие ключа, а не его содержимое

⚠️ Ловушка обратного направления: не «забыл запись — сломается», а «запись ничего не делает,
но её отсутствие выглядит как найденный баг». Проверено на `studio`, Next 16.3.4, `next build
--webpack`, 2026-09-03.

**Это точка входа по теме `transpilePackages` в монорепо.** Смежные доки описывают свой аспект и
ссылаются сюда за механизмом: [lib-entry-points](/.claude/docs/lib-entry-points.md#transpilepackages--не-нужен-для-резолва)
— опция не нужна конкретно для резолва пути через `paths` (компиляции найденного файла это не
касается, см. ниже); [nextron-renderer-transpile-packages-required](/.claude/docs/nextron-renderer-transpile-packages-required.md)
— тот же вопрос для Electron/nextron-рендерера (`animatrona`): изначальный claim «обязателен»
опровергнут 2026-09-03, там даже отсутствие ключа целиком не ломает сборку — сильнее вывода этого
дока; [nextjs-nx-composeplugins-migration](/.claude/docs/nextjs-nx-composeplugins-migration.md)
— откуда явные списки вообще взялись (миграция с `withNx`).

## Короткий ответ

Для `@letar/*`-либ монорепо **перечисление конкретного пакета в `transpilePackages` не влияет
ни на что**. Влияет только то, что ключ `transpilePackages` вообще присутствует в
`next.config.*` — с любым непустым содержимым.

Отсюда два следствия, оба контринтуитивных:

- **Приложение, импортирующее `@letar/foo` без записи о нём, собирается нормально.** Это не
  «бомба замедленного действия», не «повезло» и не повод для срочной правки.
- **Убрать ключ целиком (или «почистить, раз записи не нужны») — ломает сборку сразу.** Список
  из одного пакета работает ровно так же, как список из двадцати.

## Что происходит на самом деле

`next/dist/build/webpack-config.js` (16.3.4, строки 382–396):

```js
const shouldIncludeExternalDirs = config.experimental.externalDir || !!config.transpilePackages
const codeCondition = {
  test: { or: [/\.(tsx|ts|js|cjs|mjs|jsx)$/, /__barrel_optimize__/] },
  ...(shouldIncludeExternalDirs ? {} : { include: [dir, ...babelIncludeRegexes] }),
  exclude,
}
```

Ключевое — `!!config.transpilePackages`. Само наличие массива включает тот же режим, что и
`experimental.externalDir`: ограничение «компилировать только файлы внутри каталога приложения»
**снимается целиком**. Содержимое массива в этом выражении не участвует.

Дальше остаётся только `exclude`:

```js
const shouldExclude = excludePath.includes('node_modules')
  && !babelIncludeRegexes.some((r) => r.test(excludePath))
  && !isResourceInPackages(excludePath, finalTranspilePackages)
```

И вот здесь `@letar/*` выпадают из проверки по списку, не доходя до неё. bun линкует
workspace-либы прямыми симлинками на каталог-источник:

```
apps/studio/node_modules/@letar/query-provider -> ../../../../libs/query-provider/
```

webpack резолвит симлинки в реальный путь (`resolve.symlinks` по умолчанию `true`), поэтому
модуль приходит как `C:\web\letar\libs\query-provider\src\index.ts` — **без `node_modules` в
пути**. Первое же условие `shouldExclude` ложно → файл не исключён → SWC-лоадер применяется.
`isResourceInPackages` (единственное место, где содержимое списка вообще читается) до этого
не доходит.

То же и на стороне externals: `resolveBundlingOptOutPackages` в `handle-externals.js`
экстернализует только то, что попало под `nodeModulesRegex.test(resolvedRes)` — реальный путь
в `libs/` под него не подходит, пакет всегда бандлится.

Косвенное подтверждение прямо в тексте ошибки при снятом ключе — Next печатает import trace
через `../../libs/...`, а не через `node_modules`:

```
Import trace for requested module:
../../libs/glitchtip/src/client/index.ts
./src/instrumentation-client.ts
```

## Как это проверено

Три прогона `nx build studio --skip-nx-cache` (`next build --webpack`), меняется только
`transpilePackages` в `apps/studio/next.config.mjs`:

| Конфиг                             | Результат                                                                                               |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------- |
| 18 пакетов (как в репозитории)     | ✅ зелёный                                                                                              |
| ключ удалён целиком                | ❌ `Module parse failed: Unexpected token` на `export interface` в `libs/glitchtip/src/client/index.ts` |
| `transpilePackages: ['@letar/ui']` | ✅ зелёный — при том, что `@letar/glitchtip` из списка убран                                            |

Третья строка и есть решающая: пакет, на котором сборка падала при снятом ключе, отсутствует в
списке — и всё равно собирается. Значит ломает не отсутствие записи, а отсутствие ключа.

Живые подтверждения без всяких экспериментов уже лежат в `studio`: `@letar/jobs`
(`src/jobs/*.ts`) и `@letar/pg-url` (`src/lib/db.ts`) импортируются из `src/`, в
`transpilePackages` не перечислены и никогда там не были — прод-сборка зелёная.

## Что с этим делать

**Ничего не менять в существующих конфигах.** Записи безвредны, стоят почти ноль (Next один раз
резолвит `<pkg>/package.json` каждой), и остаются страховкой на случай, если раскладка
`node_modules` изменится: если `@letar/*` когда-нибудь окажутся физически внутри `node_modules`
(публикация в npm, смена линкера bun на раскладку с реальными каталогами вместо симлинков) —
реальный путь начнёт содержать `node_modules`, и тогда содержимое списка станет
работающим по назначению.

**Но:**

- ⛔ Не «оптимизируй» ключ до `transpilePackages: []`, и тем более не удаляй его. `!![]` === `true`,
  так что пустой массив формально ещё работает — но это хрупкая опора на приведение типов,
  а удаление ключа ломает сборку немедленно.
- ⛔ Не заводи задачу «в приложении X не хватает `@letar/Y` в `transpilePackages`» как баг
  сборки. Это вопрос единообразия, а не работоспособности. Отсутствие записи **не** объясняет
  падение прод-сборки — ищи причину в другом месте.

## Отношение к гейту `check-transpile-packages`

`scripts/check-transpile-packages.mjs` (`severity: 'gate'`, запускается в CI и в
`bun scripts/check-all.mjs`) требует, чтобы каждый импортируемый в `src/` `@letar/*`-пакет,
**объявленный в `paths` app-level `tsconfig.json`**, был перечислен в `transpilePackages`.

С учётом сказанного выше гейт проверяет соглашение о единообразии, а не работоспособность
сборки. Это нормально — но при разборе его срабатывания важно понимать, что красный гейт
означает «список разъехался с tsconfig», а не «прод-сборка сломана». В §140(4) и §141
`PLAN-INFRA-4.md` красным был именно этот гейт (шаг `Integrity checks`), а не `nx build` —
формулировка «регрессия `transpile-packages`» там про расхождение списка, и её легко прочитать
как «сборка падала».

Побочное следствие охвата гейта: пакет, импортируемый **без** записи в `paths` (резолвится через
симлинк bun — см. `.claude/rules/libs.md`, «paths — вспомогательные, не обязательные»), гейт не
видит вовсе. Так `@letar/query-provider` в `studio` не попадает ни в отчёт гейта, ни в реальную
проблему.

## Что здесь неточно в старом доке

[nextjs-nx-composeplugins-migration](/.claude/docs/nextjs-nx-composeplugins-migration.md)
утверждает, что «Next резолвит имена из `transpilePackages` через тот же алиас `paths`, даже
когда пакета физически нет в `node_modules`». Резолв идёт не через `paths` tsconfig (webpack
Next их не читает для этого), а через симлинк bun в `apps/<app>/node_modules/@letar/*`. Вывод
того дока — «явный `transpilePackages` нужен» — верен, но по другой причине: нужен **ключ**,
чтобы снялось ограничение `include: [dir]`, а не конкретные имена в нём.

## Почему эксперимент 2026-08-05 выглядел ровно наоборот

[lib-entry-points](/.claude/docs/lib-entry-points.md#transpilepackages--не-нужен-для-резолва)
описывает сплошную проверку 2026-08-05: `@letar/*` убрали из `transpilePackages` **всех**
приложений монорепо, и сборки остались зелёными. На первый взгляд это противоречит выводу
выше («убрать ключ целиком — ломает сборку сразу»). Противоречия нет — 2026-08-05 из
`next.config.*` убирали только статический литерал массива, но обёртка `withNx()` (`@nx/next`,
снята позже, коммитом `14fb647c`, 2026-09-01) на каждой сборке выполняла:

```js
nextConfig.transpilePackages ??= []
```

— то есть сама заводила ключ рантаймом, пусть и пустым (для `@letar/*` он и оставался пустым:
`readTsConfigPaths()` внутри `@nx/next` читает корневой `tsconfig.base.json`, где `@letar/*`-алиасов
нет — см. [nextjs-nx-composeplugins-migration](/.claude/docs/nextjs-nx-composeplugins-migration.md)).
`!![]` — истина, `shouldIncludeExternalDirs` включался независимо от того, что написано в
файле конфига. Эксперимент 2026-09-03 (этот док) проведён **после** ухода от `withNx`, когда
ключ больше никто не заводит неявно — поэтому его отсутствие в статическом конфиге стало видимым
и ломающим. Дата миграции — водораздел между двумя наблюдениями, не ошибка ни в одном из них.
