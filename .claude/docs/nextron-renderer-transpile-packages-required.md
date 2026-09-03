# nextron-рендерер: `transpilePackages` — не обязателен, claim опровергнут (2026-09-03)

## ⚠️ Опровержение 2026-09-03

**Заголовок и весь раздел «Проблема» ниже — исходная (ошибочная) гипотеза, оставлена как
история.** Причинная проверка (см. [transpile-packages-array-presence-not-content](/.claude/docs/transpile-packages-array-presence-not-content.md)
— методология и механизм для обычных приложений монорепо) показала: для
`apps/animatrona/renderer` `transpilePackages` **тоже не обязателен**, причём сильнее, чем у
обычных приложений («наличие ключа, не содержимое» — там при полном отсутствии ключа сборка
`studio` падала). Здесь три последовательных чистых прогона (`rm -rf .next` + `next.exe build
--webpack`, коммит `c302242c`) дали:

| Конфиг                                  | Результат  |
| --------------------------------------- | ---------- |
| 15 пакетов, как в репозитории           | ✅ зелёный |
| `transpilePackages: ['@letar/ui']`      | ✅ зелёный |
| ключ удалён из `next.config.js` целиком | ✅ зелёный |

Все три сборки прошли чисто, включая `/_not-found` и все 22 маршрута, с теми же неродственными
warning'ами (`Critical dependency` в `db-orm.ts`), что и baseline. Точка расхождения со `studio`
найдена частично: `next/dist/build/webpack-config.js` заводит module rules с SWC-лоадером в
нескольких местах — часть спреит `...codeCondition` (что включает ограничение `include: [dir,
...babelIncludeRegexes]`, снимаемое присутствием `transpilePackages`), а часть использует только
`test: codeCondition.test` без `include`-ограничения вовсе (строки 1404/1419/1435/1441/1446/1456
в 16.3.4). Отладочный `console.log` внутри `getBaseWebpackConfig` подтвердил: даже с
`shouldIncludeExternalDirs = false` и `dir = apps/animatrona/renderer` (т.е. `libs/ui` физически
вне `dir`), сборка компилировала `libs/*`-файлы без единой ошибки — какое-то из
неограниченных правил их всё равно ловит. Почему для `studio` (тот же Next 16.3.4) в этом месте
падало, а для `animatrona/renderer` нет — не прослежено до конца (кандидат — различие в наборе
активных module rules при разных `compilerType`/`isServer`/наличии `appDir` у двух конфигураций,
не проверено экспериментально из-за трудозатрат). **Практический вывод не зависит от точного
объяснения:** записи в `transpilePackages` для этого приложения не требуются для зелёной сборки,
как и для остальных 27 (см. дока выше).

**Что не менять:** существующий список 15 пакетов в `apps/animatrona/renderer/next.config.js`
трогать не нужно — записи безвредны, лишними не мешают, и остаются подстраховкой на случай смены
раскладки `node_modules` (та же логика, что и в общем доке). Гейт `check-transpile-packages.mjs`
по-прежнему требует их наличия для единообразия со всеми приложениями — это по-прежнему валидно
как соглашение, просто не как условие работоспособности сборки.

Методика проверки (побайтовое восстановление `next.config.js` через `git checkout --` +
сверка md5, `rm -rf .next` между прогонами) описана в разделе «Диагностика» ниже — она осталась
актуальной, только предпосылка изменилась.

## Проблема (исходная гипотеза, опровергнута — см. выше)

Общая гипотеза перед проверкой: `apps/animatrona/renderer` (Electron/nextron, `next build
--webpack`) резолвит `@letar/*`-библиотеки напрямую в исходники под `libs/*` через `paths` в
`tsconfig.json` — то есть это не сторонний npm-пакет из `node_modules`, а «свой» TS-файл, и
поэтому `transpilePackages` ему как будто не нужен: резолв путей уже работает без него.

~~Это неверно.~~ Ревизия 2026-09-03: это оказалось верно после всех оговорок — эксперимент
выше показал зелёную сборку и без ключа вовсе. Оставлено для истории:
**Резолв пути к файлу и транспиляция его синтаксиса — два разных механизма.**
`tsconfig.json paths` (и `webpack.config.js` `resolve.alias` у `main/`, см.
[animatrona-dual-build-alias-drift](/.claude/docs/animatrona-dual-build-alias-drift.md)) отвечают
только за то, ГДЕ webpack найдёт файл. Найденный файл всё равно проходит через loader webpack —
без явного `transpilePackages` первый же `interface`/`export type`/другой TS-only синтаксис
внутри такого пакета _может_ дать `Module parse failed: Unexpected token` — но для этого
конкретного приложения экспериментально не подтвердилось. Точный механизм (что именно
в конфигурации Next.js это включает и почему играет роль наличие ключа, а не список имён в нём) —
в [transpile-packages-array-presence-not-content](/.claude/docs/transpile-packages-array-presence-not-content.md),
здесь — только специфика nextron-рендерера.

## Почему раньше не проявлялось

Коммит `0693e342` (миграция с deprecated `@nx/next` `composePlugins`/`withNx`, см.
[nextjs-nx-composeplugins-migration](/.claude/docs/nextjs-nx-composeplugins-migration.md)) снял
`@letar/*`-записи из `transpilePackages` у **всех** приложений монорепо разом, включая
`animatrona/renderer` — общий шаблон правки не различал nextron-рендерер от обычного Next.js
приложения. У остальных 20 приложений следующий `nx build` тут же поймал `Module not found`/
`Unexpected token` и записи вернули. У `animatrona/renderer` этого не произошло: `.next/cache`
от прошлых успешных сборок (сделанных ДО коммита `0693e342`, когда `withNx` ещё инжектил список
через граф Nx) оставался на диске и создавал видимость «билд по-прежнему зелёный» — сборки без
`--skip-nx-cache` и живого CI-прогона именно на этом приложении не проводилось до аудита §75
(`PLAN.md`).

## Диагностика — причинная проверка, не полагаться на кэш

```bash
cd apps/animatrona/renderer
rm -rf .next
../../../node_modules/.bin/next.exe build --webpack   # НЕ npx — см. предупреждение ниже
```

Без `@letar/*` в `transpilePackages`:

```
Module not found: Can't resolve '@ark-ui/react/anatomy'   ← НЕ про это, см. ниже
```

⚠️ **Ловушка при повторной проверке на общем чекауте `C:\web\letar`:** этот же текст ошибки
(`Module not found` для `@ark-ui/react/*` подпутей) вылезает и НЕЗАВИСИМО от
`transpilePackages` — если в момент сборки где-то в репозитории идёт параллельный `bun install`
(десятки/сотни `bunx.exe`-процессов от других агентов — обычное дело в этом монорепо, см.
корневой `CLAUDE.md` про параллельную работу агентов). Изолированная установка bun может на
секунды физически убирать `node_modules/@ark-ui` целиком во время релинковки. Диагностика —
`ls node_modules/@ark-ui/` в момент ошибки: если каталога нет вообще, это гонка за
`node_modules`, а не баг конфигурации; повторить сборку после того как `bun install` в других
сессиях завершится. Правильный сигнал по факту `transpilePackages` — конкретно
`@letar/*`-пакеты в тексте ошибки (`Can't resolve '@letar/video-player-core'` и т.п.), либо
`Module parse failed: Unexpected token` внутри файла `libs/*/src/**/*.ts`.

С `@letar/*` в `transpilePackages` (актуальное состояние, commit `c302242c`): webpack компилирует
чисто (только неродственные warning'и вроде `Critical dependency: the request of a dependency is
an expression` в `src/lib/db-orm.ts` — не про транспиляцию), сборка доходит до этапа
prerendering страниц.

⚠️ **Не используй голый `npx next build`** для этой проверки — `npx` может резолвить
`next` не из `node_modules` монорепо, а поставить отдельную копию из реестра (`npm warn exec The
following package was not found and will be installed: next@X.Y.Z`), и результат перестаёт быть
достоверным индикатором состояния monorepo-сборки. Правильный бинарник —
`node_modules/.bin/next.exe` (Windows) относительно корня монорепо, либо через `nx build
animatrona` (тянет заодно `download-ffmpeg`/`download-fpcalc` — медленнее, но точно
воспроизводит прод-пайплайн).

## Фикс

`apps/animatrona/renderer/next.config.js` → `transpilePackages` должен включать каждый
`@letar/*`-пакет, реально импортируемый где-то в `renderer/src/`, точно так же, как у обычного
Next.js приложения монорепо (см. корневой `CLAUDE.md` § «Проверки целостности монорепо» —
`scripts/check-transpile-packages.mjs` в общем раннере `check-all.mjs` покрывает и это
приложение наравне с остальными 27, гейт `--group=deps`/полный прогон ловит будущий дрейф).

Лишние записи (пакет уже транспилируется через другой путь) безвредны — гейт проверяет только
отсутствие обязательных, не запрещает избыточные.

## Когда перепроверять

Любой новый прямой импорт `@letar/*` в `apps/animatrona/renderer/src/` — сверить с
`transpilePackages` тем же гейтом (`node scripts/check-transpile-packages.mjs`), не полагаться
на то, что «раньше как-то собиралось». Кэш `.next` — не доказательство корректности конфигурации.

## Дополнение 2026-09-01: транзиентный `InvariantError` на `/_not-found` — тоже гонка за node_modules

При причинной проверке фикса выше одна сборка (`rm -rf .next` + `next.exe build --webpack`)
единожды упала на этапе `Generating static pages` с:

```
Error occurred prerendering page "/_not-found". Read more: https://nextjs.org/docs/messages/prerender-error
Error [InvariantError]: Invariant: Expected workStore to be initialized. This is a bug in Next.js.
Export encountered an error on /_not-found/page: /_not-found, exiting the build.
```

Осмотр кода не дал зацепки: в `layout.tsx` нет вызовов `headers()`/`cookies()` на уровне модуля,
единственный Route Handler с `force-dynamic` (`api/model/[...path]/route.ts`) грузит всё лениво
внутри `async`-функций, `api/image/route.ts` не использует dynamic API вообще. Известная ловушка
[nextjs-root-notfound-no-root-layout](/.claude/docs/nextjs-root-notfound-no-root-layout.md) сюда
не подходит — `layout.tsx` на месте.

Два последующих чистых прогона (`rm -rf .next` + билд, без изменения кода) прошли зелёными —
`/_not-found` собрался как `○ (Static)`. В момент первого падения `node_modules/next` уже
указывал на 16.3.4, но в `node_modules/.bun/` одновременно лежали три версии next
(16.3.2/16.3.3/16.3.4) — след параллельной пересборки isolated-стора другой сессией. Это тот же
класс гонки, что описан выше для `@ark-ui/react` (изолированная установка bun на секунды
физически убирает/подменяет модули во время релинковки), просто с другим симптомом: там —
`Module not found`, здесь — рантайм-инвариант Next (вероятно, из-за частично
подменённого/несогласованного `next/dist/server/*` в момент запуска build-воркеров).

**Диагностика:** если `InvariantError: Expected workStore to be initialized` на `/_not-found`
не воспроизводится вторым чистым прогоном подряд — это гонка за `node_modules`, а не баг кода
приложения. Не чинить код в ответ на одноразовое падение; перепроверять причинно (`rm -rf .next` +
билд ещё раз, желательно когда в репозитории не идёт параллельный `bun install`).
