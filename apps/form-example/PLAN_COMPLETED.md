# Выполненные задачи — form-example

## Сессия 2026-08-12 — GlitchTip + первый staging + фикс невалидного e2e-прогона

Подключение к GlitchTip (`nx g @letar/generators:glitchtip-integrate form-example`,
PLAN-INFRA.md §70) — только production (нет `docker-compose.staging.yml` на тот момент), DSN
проекта id=11.

Заведён **первый staging** (§18.7 Тираж M2) — `docker-compose.staging.yml` (Traefik-лейблы,
`form-example-stage.s3.letar.best`, порты 5466/3033), `.env.staging.enc`. БД (`Product`/`Contact`,
демо-данные) — e2e-сьют тестирует поведение форм напрямую, сид не понадобился.

Первый прогон e2e (BlackCove) оказался невалидным — `apps/form-example-e2e/playwright.config.ts`
хардкодил `webServer.url: 'http://localhost:3022'` вместо `baseURL`: readiness-проверка стучалась
в localhost, не видела там ничего и тихо поднимала `next dev` на `localhost:3000` (Turbopack) —
все 48 тестов упали против него, не против стейджа. Плюс `form-example-e2e` не имел
`project.json` — та же категория бага, что чинили на `time`/`aboi`/`grandslamcup-e2e` 2026-07-19:
без явного `executor: '@nx/playwright:playwright'` Nx-инференс через `@nx/playwright/plugin`
добавляет `dependsOn` на dev-таск ДО проверки `reuseExistingServer`/`url`, обходя
`playwright.config.ts`. Оба фикса внесены, `project.json` заведён.

## Сессия 2026-08-06 — package.json создан + lint-ошибки в демо-страницах починены

### `package.json` + `nx.implicitDependencies`

Приложение вообще не имело `package.json` (только `tsconfig.json`) — единственное среди `apps/*`
в таком состоянии (см. корневую причину сломанного `zenstack:generate` в сессии 2026-08-04 ниже:
тогда фикс был через относительный `provider`-путь в `schema.zmodel`, а не через добавление
`package.json`). По правилу [libs.md](/.claude/rules/libs.md) создан `package.json` (`name:
"form-example"`, `version: "0.1.1"` — по последней записи `CHANGELOG.md`) с `nx.implicitDependencies:
["@letar/forms", "@letar/demo-protection", "@letar/analytics", "@letar/seo"]` — сверено с `paths`
в `tsconfig.json`. `nx show project form-example` после правки резолвит то же имя проекта, что и
раньше (через `project.json`), регрессии нет.

⚠️ `nx typecheck:tsgo form-example` по-прежнему падает (11 ошибок `TS2339` на `db.product` и
т.п.) — это не связано с этой правкой: `zenstack:generate` для приложения падает независимо,
из-за отсутствующего `DATABASE_URL` в локальном `.env.local` (уже задокументировано в
[PLAN-INFRA.md §45](/PLAN-INFRA.md)). Подтверждено на чистом состоянии: ошибка та же и без
`package.json`.

### Lint-ошибки в демо-страницах (pre-existing, не связаны с добавлением package.json)

`nx lint form-example` падал на 5 ошибках в 3 файлах — не следствие правок этой сессии, чинилось
заодно:

- `examples/theming/page.tsx` (×2), `examples/undo-redo/page.tsx` — пустые `onSubmit={async () =>
  {}}` (`@typescript-eslint/no-empty-function`) заменены на no-op с комментарием-пояснением.
- `examples/async-validation/page.tsx` — `curly`: однострочный `if` без фигурных скобок.
- `examples/persistence/page.tsx` — `no-empty`: пустой `catch {}` дополнен комментарием.

`nx lint form-example` — зелёный (остались только 3 несвязанных pre-existing warning
`Unused eslint-disable directive` в `input.ts`/`models.ts`/`schema.ts`, вне скоупа).

## Сессия 2026-08-04 — таргет zenstack:generate починен

Обнаружено в сессии §37 корневого `PLAN.md`: таргет `zenstack:generate` был сломан на чистом
checkout'е, обходился вручную сгенерированным клиентом мимо таргета.

- **Корневая причина:** `apps/form-example` — единственное приложение среди потребителей
  `@letar/zenstack-form-plugin`, у которого нет собственного `package.json` (не участвует в bun
  workspaces индивидуально). Из-за этого нигде не появляется симлинк
  `node_modules/@letar/zenstack-form-plugin`, а `provider = '@letar/zenstack-form-plugin'` в
  `schema.zmodel` не резолвится обычным Node-разрешением модулей (ZenStack CLI — Node-процесс,
  не TypeScript, `tsconfig` paths/`customConditions` ему не помогают).
- **Фикс:** `provider` переведён на относительный путь к сборке —
  `'../../libs/zenstack-form-plugin/dist/index.js'` — тем же приёмом, что уже применён в
  `apps/form-develop-app/schema.zmodel`.
- **Побочная находка:** сам fallback `zenstack generate || (... npx prisma generate)` был
  логической ошибкой, а не временным костылём под сломанный плагин. `@zenstackhq/cli` v3.9.0
  игнорирует блок `generator client { provider = 'prisma-client-js' }` в zmodel (warning
  `"generator" is not used by ZenStack`) — Prisma Client им не генерируется вообще. `||`
  означал, что после фикса плагина `zenstack generate` стал бы успешным и полностью скрывал
  вызов `prisma generate`, оставляя `PrismaClient` не пересгенерированным. Заменено на
  последовательное `zenstack generate && prisma generate` (без `npx` — бинарь берётся из
  `node_modules/.bin` монорепо через nx, `npx` в подкаталоге без своего `package.json` вместо
  этого лез в registry за посторонним пакетом `zenstack@2.22.3`).
- Также раскрылась причина, почему `npx zenstack generate` руками из `apps/form-example` вообще
  не работал ни разу: `npx` в каталоге без локального `node_modules` не поднимается по дереву до
  корневого `node_modules/.bin` (в отличие от PATH, который получает процесс, запущенный через
  `nx`) — и подтягивал из npm registry несвязанный пакет `zenstack@2.22.3` вместо
  `@zenstackhq/cli@3.9.0` монорепо.
- Проверено на чистой генерации (`--skip-nx-cache`, `rm -rf src/generated/form-schemas/*`):
  `nx run form-example:zenstack:generate` и `nx run form-example:typecheck:tsgo` — оба зелёные.
  Регенерированные `.form.ts`-файлы отличаются только форматированием более новой версии
  плагина, содержательных регрессий нет.
- Оставлено на будущее (не в скоупе этой сессии — низкий приоритет, апп единственный без
  `output = "./prisma"` в `generator client`, PrismaClient пишется в общий хойстнутый
  `node_modules/@prisma/client`): миграция на паттерн `plugin prisma` + `plugin typescript` по
  образцу `form-develop-app`, чтобы ZenStack v3 сам генерировал `prisma/schema.prisma` из
  `schema.zmodel` вместо ручной синхронизации двух файлов.

## Сессия 2026-07-15 — rollout-профиль включён, деплой закрыт

- `letar.rollout: 'true'` раскомментирован в `docker-compose.production.yml` — приложение
  структурно готово к rollout ещё с 2026-07-12 (commit `098eb75`), ждало подтверждения
  NPM-роутинга обычным деплоем (условие выполнено).
- Rollout-пилот прошёл с четвёртой попытки — вскрылись и устранены три независимых бага
  инфраструктуры (все правки в compose/env, не в коде приложения):
  1. `db:` секция никогда не публиковала host-порт — `deploy-affected.sh` мигрирует с хоста
     через `localhost:$DB_PORT`, слушать было нечего (`P1001`). Фикс: `ports: '5443:5432'`
     (commit `d0c5cfc`).
  2. `.env.docker` содержал `POSTGRES_PASSWORD`, но не `DB_PASSWORD` — единственное такое
     приложение в монорепо, скрипт строит `DATABASE_URL` для миграций именно из `DB_PASSWORD`
     (`P1000` Authentication failed). Фикс: добавлена переменная, `.env.docker.enc` пересобран
     через `sops` (commit `fd67766`).
  3. `prisma/migrations/` никогда не существовала в репо — схема на проде была накатана через
     `prisma db push`, а не `migrate`, что несовместимо с `migrate deploy` против непустой БД
     (`P3005`). Фикс: сгенерирована и провалидирована baseline-миграция `20260715163011_init`
     (commit `b63b132`), на проде помечена применённой через `prisma migrate resolve --applied`
     (без DDL, схема совпадала).
- Итог: `form-example-app-2` healthy, zero-downtime, старый контейнер убран. Деплой-агент —
  BlackCove, координация через Agent Mail (thread `deploy-form-example-mandala-rollout-J`).

## Сессия 2026-07-12 — security-фикс + баг /products 500

### Ротация захардкоженного пароля Postgres

- В `docker-compose.production.yml` был захардкожен пароль Postgres в открытом виде (публичный репозиторий) — `POSTGRES_PASSWORD` и внутри `DATABASE_URL`
- Сгенерирован новый пароль через `openssl rand -base64 32`, вынесен в `.env.docker`/`.env.docker.enc` (SOPS), compose переведён на `${POSTGRES_PASSWORD}` (образец `apps/time`)
- Деплой через BlackCove: `ALTER USER forms` на живом `form-example-db` синхронно с пересозданием контейнеров

### Баг `/products` 500 (ECONNREFUSED) — найдена и устранена реальная причина

- Предыдущая попытка фикса через `outputFileTracingIncludes` (`.prisma/client`) была мимо цели — файлы трассировки были ни при чём
- Реальная причина: в bun-хостинге монорепо параллельно установлено несколько версий `pg` (hoisting: 8.20/8.21/8.22). `db.ts` создавал `new Pool()` через одну версию, `@prisma/adapter-pg` внутри резолвил свою — `instanceof Pool`-проверка между разными классами не проходила, адаптер тихо создавал свой Pool без connectionString → падал на `localhost:5432`. Ошибка маскировалась generic `ECONNREFUSED` внутри `performIO` (известный баг Prisma, [prisma/prisma#28055](https://github.com/prisma/prisma/issues/28055))
- Фикс: `src/lib/db.ts` — `PrismaPg({ connectionString })` напрямую вместо готового `Pool`-инстанса
- Диагностика и проверка фикса проведены вживую на s2 через `docker exec` в работающем контейнере (не через локальную пересборку — Windows-сборка даёт другой класс проблем с абсолютными symlink, не относящийся к прод-багу)

## v0.1.0 (2026-04-04)

### Реализовано

- 38 example-страниц (basic, validation, multi-step, offline, i18n, и др.)
- ArticleLink компонент — ссылки на статьи цикла
- 5 новых DX-страниц: analytics, server-errors, undo-redo, readonly, skeleton
- Интеграция с @letar/forms через tsconfig path alias

### Фикс `references` на библиотеки в `tsconfig.json` (2026-08-07)

`apps/form-example/tsconfig.json` ссылался на 4 библиотеки (`demo-protection`, `analytics`,
`forms`, `seo`) через `references` — тот же редирект-баг, что в `dashboard-agent` (0.11.1), см.
`.claude/rules/libs.md`.

- Убран блок `references`, добавлен `"rootDir": "../.."` (тот же приём, что в
  `form-develop-app` — приложение расширяет `tsconfig.next-app.json` с заданным `outDir`,
  без явного `rootDir` TypeScript выводил его как `apps/form-example` и отбрасывал файлы `libs/*`
  с `TS6059`).
- Базовый прогон (без фикса) — 118 ошибок в 51 файле. После фикса — 11 ошибок, все `TS2339`
  (`Property 'contact'/'product' does not exist on PrismaClient`) — не связаны с этой правкой,
  предсуществующее расхождение сгенерированного Prisma-клиента, вне скоупа.
- `nx build form-example --skip-nx-cache` — успешно.

---

**Последнее обновление:** 2026-08-07
