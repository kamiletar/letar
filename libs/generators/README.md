# @letar/generators

Локальный Nx-плагин с генераторами для монорепо `letar`. Не публикуется в npm — существует только
как workspace-пакет для `nx generate`.

## Генераторы

### `e2e-suite`

Скаффолдит новый Playwright e2e-сьют `apps/<app>-e2e` по конвенции, уже принятой в монорепо
(идентична `time-e2e`/`pravda-e2e`): `package.json` (`implicitDependencies`), `tsconfig.json`,
`eslint.config.mjs`, `playwright.config.ts` (baseURL/webServer на dev-порт приложения, три
браузерных проекта chromium/firefox/webkit), `.gitignore` (исключает `playwright/.auth/` —
cookie-сессии storageState — и артефакты прогонов), стартовый `src/homepage.spec.ts`.

```bash
nx g @letar/generators:e2e-suite <app>
# или с явным портом, если порт приложения нигде не объявлен
nx g @letar/generators:e2e-suite <app> --port=3033
```

Порт по умолчанию читается из `apps/<app>/.env` (`PORT=<число>` — единственное, что там должно
быть, см. `.claude/rules/env-files.md`), а если его там нет — из `.env.local` и `-p <порт>` в
`project.json` (так порт задают лендинги).

**Генератор не перезаписывает существующие сьюты** — если `apps/<app>-e2e` уже есть, падает с
понятной ошибкой.

⚠️ **После генерации:** `nx e2e <app>-e2e` может зависнуть намертво в dev-режиме Next.js — см.
[`.claude/docs/e2e-testing.md`](/.claude/docs/e2e-testing.md) § «nx e2e зависает в dev-режиме» за
обходным путём (прогон `bunx playwright test` напрямую против вручную поднятого dev-сервера).

### `electron-app`

Скаффолдит новое минимальное Electron/Nextron-приложение `apps/<name>` — тот же каркас, что
руками собирался для `apps/poster-microtext-desktop`: Electron main + Next.js renderer
(статический экспорт `output: 'export'`, без сервера внутри приложения, вся логика через IPC),
Chakra UI v3, `webpack.config.js`/`electron-builder.yml`/`nextron.config.js` с уже впаянными
фиксами известных граблей (см. [`.claude/rules/electron.md`](/.claude/rules/electron.md) §
«Грабли»): `assetPrefix: './'` под `file://`, точная версия electron, `publish: null`.

```bash
nx g @letar/generators:electron-app <name>
# с явным displayName/description/private:
nx g @letar/generators:electron-app <name> --displayName="Моё приложение" --private
```

Версия `electron`/`electron-builder` в сгенерированном `package.json` берётся из корневого
`package.json` монорепо (диапазон `^x.y.z` пиннится до точной версии — electron-builder не умеет
скачивать бинарник по диапазону).

**Генератор не перезаписывает существующие приложения** — если `apps/<name>` уже есть, падает с
понятной ошибкой.

⚠️ **После генерации:** сгенерированное приложение — минимальный работающий каркас без бизнес-логики
(экран показывает только версию Electron). Дальше: заменить иконку, дописать `main/services/` и
`main/ipc/*.handlers.ts`, при необходимости завести приватный submodule — все шаги описаны в
сгенерированном `README.md`. Nextron не поддерживает `nx generate` из коробки — второй референс для
более сложного приложения (БД, автообновление, сканер) — `apps/label-printer-desktop`.

### `new-lib`

Скаффолдит новую shared-библиотеку `libs/<name>` (`@letar/<name>`) по актуальной конвенции монорепо
(сверено с `libs/format-utils`/`libs/validation-utils`, а не только со старым `new-lib.md`):
`package.json`, `project.json` (`typecheck`/`typecheck:tsgo`/`oxlint`/`lint`/`test`), `tsconfig.json` +
`tsconfig.lib.json` + `tsconfig.spec.json` (композитная схема с раздельным spec-конфигом — обязательна
для vitest 4 + vite 8 oxc, см. `.claude/docs/unit-testing.md`), `vitest.config.ts`, `eslint.config.mjs`,
`README.md`, стартовые `src/index.ts` / `src/lib/feature.ts` / `src/lib/feature.spec.ts`.

```bash
nx g @letar/generators:new-lib <name>
# с описанием для README:
nx g @letar/generators:new-lib <name> --description="Утилиты для X"
```

**Генератор не перезаписывает существующие библиотеки** — если `libs/<name>` уже есть, падает с понятной
ошибкой.

⚠️ **После генерации:** подключение к приложению — три обязательных места (`.claude/rules/libs.md`):
`paths` и `references` в `tsconfig.json` приложения, `implicitDependencies` в его `package.json`, затем
`nx sync`.

### `new-app`

Скаффолдит новое минимальное Next.js приложение `apps/<name>` — чистый каркас Chakra UI v3 + MDX без
типового boilerplate, который иначе приходится вычищать руками после `nx g @nx/next:application`
(`global.css`, `.swcrc`, `next.config.js`, `api/hello`) — см. полный ручной процесс в
[`.claude/commands/create/new-app.md`](/.claude/commands/create/new-app.md), который этот генератор
заменяет для шагов 1–13 (структура, тема, provider'ы, MDX, vitest).

```bash
nx g @letar/generators:new-app <name>
# с явным портом/именем/описанием/приватностью:
nx g @letar/generators:new-app <name> --port=3033 --displayName="Моё приложение" --private
```

Порт по умолчанию — **следующий за максимальным занятым** `3xxx` (продолжение последовательности, а не
первая дырка в ней). Занятые порты собираются из `apps/*/.env`, `apps/*/.env.local` и `-p <порт>` /
`--port=<порт>` в `apps/*/project.json` — часть приложений (лендинги) объявляет порт только там.
`3000` не выдаётся никогда: это дефолт `next dev` без `-p`.

Сгенерированное приложение **осознанно минимально** — без БД, форм, аутентификации, PWA. Это
отправная точка, а не копия `grandslamcup`/`driving-school` — те эталоны несут специфику (Serwist,
Better Auth, cookie-баннер и т.д.), которую не всем новым приложениям нужно тащить с первого дня.

**Генератор не перезаписывает существующие приложения** — если `apps/<name>` уже есть, падает с понятной
ошибкой.

⚠️ **После генерации остаются ручные шаги** (намеренно не автоматизированы, см. `.claude/commands/create/new-app.md`
§14+): приватный submodule, регистрация в Dashboard/`deploy-affected.sh`, бэкапы, `docker-compose.production.yml` +
`output: 'standalone'`, e2e-gate, MCP postgres, ПДн-чеклист (если приложение собирает персональные
данные — см. `.claude/docs/personal-data.md`).

## Разработка нового генератора

1. `mkdir src/generators/<name>`, добавь `generator.ts` + `schema.json`/`schema.d.ts` + `files/`
   (шаблоны с суффиксом `__tmpl__`, dotfiles — `__dot__<name>__tmpl__`, EJS-синтаксис `<%= var %>`)
2. Зарегистрируй в `generators.json`
3. Покрой тестом на `createTreeWithEmptyWorkspace()` (см. `e2e-suite/generator.spec.ts`).
   ⚠️ Фикстура должна повторять **форму реальных данных**, а не удобную для проверки: баг
   автоподбора порта прожил незамеченным именно потому, что тест писал конфигурацию портов,
   которой в монорепо не бывает ([PLAN-INFRA.md §34](/PLAN-INFRA.md))
4. Не пиши заново то, что уже лежит в `src/utils/` — оно общее для всех генераторов:

| Утиль       | Что даёт                                                                                                          |
| ----------- | ----------------------------------------------------------------------------------------------------------------- |
| `tree.ts`   | `templatesDirFor(import.meta.url)` — путь к `files/`; `assertTargetIsFree()` — проверка, что проект не затирается |
| `naming.ts` | `toDisplayName()`, `toCamelCase()` — kebab-case имя проекта в то, что идёт в шаблоны                              |
| `ports.ts`  | `resolveNextFreePort()` для нового приложения, `resolveAppPort()` для существующего                               |
