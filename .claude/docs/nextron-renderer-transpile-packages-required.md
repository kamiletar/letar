# nextron-рендерер: `transpilePackages` для `@letar/*` — обязателен, не опционален

## Проблема

Общая гипотеза перед проверкой: `apps/animatrona/renderer` (Electron/nextron, `next build
--webpack`) резолвит `@letar/*`-библиотеки напрямую в исходники под `libs/*` через `paths` в
`tsconfig.json` — то есть это не сторонний npm-пакет из `node_modules`, а «свой» TS-файл, и
поэтому `transpilePackages` ему как будто не нужен: резолв путей уже работает без него.

Это неверно. **Резолв пути к файлу и транспиляция его синтаксиса — два разных механизма.**
`tsconfig.json paths` (и `webpack.config.js` `resolve.alias` у `main/`, см.
[animatrona-dual-build-alias-drift](/.claude/docs/animatrona-dual-build-alias-drift.md)) отвечают
только за то, ГДЕ webpack найдёт файл. Найденный файл всё равно проходит через loader webpack —
а по умолчанию Next.js исключает из транспиляции `babel-loader`/`swc` всё, что резолвится как
пакет по спецификатору `@scope/name` (даже если физически лежит вне `node_modules` — как
`@letar/*` через `paths`). Без явного `transpilePackages` первый же
`interface`/`export type`/другой TS-only синтаксис внутри такого пакета даёт `Module parse
failed: Unexpected token`.

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
