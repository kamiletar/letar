# Time — Выполненные задачи

## Применён Pressable к главным CTA (2026-08-19, v0.5.5)

Тема подключала `pressableConfig` из `@letar/ui` (keyframes + `globalCss` целиком) со скаффолда,
но ни один компонент им не пользовался (находка в рамках аудита четырёх приложений с той же
проблемой: aboi, dsperevod, synth, time). Владелец решил применить, а не убрать.

Создан `src/app/_components/pressable-cta.tsx` (по образцу domwellbes, `borderRadius="l2"` —
своего `buttonRecipe` в time нет). В приложении не было ни одной solid-залитой кнопки (весь стиль
— outline/ghost), а ripple `@letar/ui` захардкожен светлым и на такой поверхности не виден —
поэтому 3 обёрнутых CTA («Войти» в `subscribe-button.tsx`, «Сохранить» и «Создать подписку» в
`profile/page.tsx`) дополнительно переведены на `colorPalette="brand" variant="solid"`.
`globalCss` темы сужен до точечного `'[data-pressable]': { touchAction: 'manipulation' }`.

⚠️ Смена стиля этих трёх кнопок на solid — решение сверх «просто обернуть», принятое агентом по
необходимости (иначе Pressable был бы незаметен). Владелец ещё не подтвердил его глазами — если
вариант не понравится, можно откатить кнопки на `outline`, эффект `touchAction` при этом
сохранится, просто ripple будет невидимым.

## `noindex` для `/profile`, `/sign-in`, `/unsubscribe` (2026-08-12, PLAN-INFRA.md §33)

Часть кросс-приложенческого захода по инфраструктурным трекам. `robots.ts` уже блокировал эти
пути в `/robots.txt`, но краулер, зашедший по внешней ссылке в обход `robots.txt`, всё равно мог
их проиндексировать. Все три страницы — клиентские компоненты (`'use client'`), объявить
`metadata` напрямую в них нельзя. Добавлены server `layout.tsx` только ради `robots: { index:
false, follow: false }`, по образцу `archetest/settings/layout.tsx`.

`typecheck:tsgo`/`nx lint` зелёные. Commit `86368d69`.

## Подключение к GlitchTip (2026-08-11)

Через новый генератор `nx g @letar/generators:glitchtip-integrate time` (PLAN-INFRA.md §70 п.8) —
первый прогон генератора на приложении с реальным staging-контуром
(`docker-compose.staging.yml` + `.env.staging.example`).

- [x] `src/instrumentation.ts`/`instrumentation-client.ts` — созданы с нуля (файлов не было)
- [x] `package.json` — `@letar/glitchtip` в `dependencies` и `nx.implicitDependencies`
- [x] `tsconfig.json` — `paths` на `@letar/glitchtip`, `/client`, `/server`
- [x] `.env.staging.example` — 4 переменные добавлены (значение `GLITCHTIP_ENVIRONMENT=staging`,
      генератор различает production/staging по тому, какой env-файл дополняет)
- [x] `docker-compose.production.yml` и `docker-compose.staging.yml` — оба через `${VAR}` в
      `services.app.environment`, не литералом
- [x] `nx typecheck:tsgo time && nx lint time` — зелёные (pre-existing lint-ошибка в
      `src/lib/auth.ts:23` не относится к этой задаче, не трогалась)

**Не завершено:** GlitchTip-проект `time` ещё не создан в UI, `GLITCHTIP_DSN` пустой — деплоить
рано, см. `infra/glitchtip/README.md`.

## 2026-08-08 (техдолг: latent-баг vitest alias для @letar/seo)

`vitest.config.ts` резолвил `@` через `resolve.alias`, но не имел записи для `@letar/seo` — путь
уже был в `tsconfig.json`, но не в vitest. Latent-баг: тестовых файлов в приложении пока нет, но
первый же тест, транзитивно тянущий `@letar/seo` (например через `robots.ts`), упал бы с «Failed
to resolve import "@letar/seo"» — та же дыра, что чинили в `apps/aboi` в этой же сессии. Добавлен
alias `'@letar/seo': resolve(__dirname, '../../libs/seo/src')` по образцу `apps/aboi/vitest.config.ts`.

## 2026-08-06 (SEO-гейт индексации, сессия по инфра-трекам PLAN-INFRA.md §33)

Часть кросс-приложенческого захода по `PLAN-INFRA.md` §33 (SEO-фундамент для приложений без
`robots.ts`/`sitemap.ts`). `time` — единственное из девяти приложений в этой сессии, где нашёлся
реальный производственный баг, не просто отсутствие файла:

- **Найдено:** `generateMetadata()` в `[locale]/layout.tsx` отдавал `robots: { index: true, follow:
  true }` **безусловно**, без проверки окружения — staging (`time-stage.s3.letar.best`) индексировался
  поисковиками наравне с продом.
- **Починено:** подключена `@letar/seo` (`isProductionDomain()` — гейт «прод или нет» через сверку
  реального `NEXT_PUBLIC_BASE_URL`, `NODE_ENV` для этого не годится, см. `PRODUCTION_URL =
  'https://time.letar.best'` в layout), `robots: { index: isProductionDomain(...), follow:
  isProductionDomain(...) }`.
- Добавлены `src/app/robots.ts` (закрыт `/profile`, `/sign-in`, `/unsubscribe`, `/api/` — не
  контент) и `src/app/sitemap.ts` (главная + `/privacy` на всех 40 локалях, `alternates.languages`
  на каждую запись).
- `nx build time` — зелёный, `robots.txt`/`sitemap.xml` подтверждены в выводе сборки.

## v0.5.0 — 2026-07-28 (152-ФЗ: consent-инфраструктура с нуля + первый baseline миграций)

Часть кросс-приложенческого аудита 152-ФЗ (root `PLAN.md`, Этап 0.8, сессия root-weaver). Приложение
собирает email (Better Auth, hub-client), но не имело ни одного элемента чек-листа 152-ФЗ. Добавлено:

- `ConsentLog` в `schema.zmodel`
- `POST /api/consent` — sha256-хэш IP, без email/точного IP
- `CookieBanner`/`CookieSettingsButton` из `@letar/ui` в layout/toolbar
- Страница `/privacy`

**Важная находка:** у приложения вообще не было папки `prisma/migrations` — три таблицы (`User`,
`NotificationLog`, `NotificationSubscription`) существовали в dev-БД только через исторический
`db:push`, без истории миграций. С явного разрешения владельца (2026-07-28) локальная dev-БД очищена
(`DROP SCHEMA public CASCADE`) и создана первая миграция `init`, включающая существующие модели +
`ConsentLog` — теперь `prisma migrate status` и деплой на прод пойдут через нормальный migration-флоу.

## 2026-07-19 — Настоящий root cause staging-гейта: отсутствие `project.json`, подтверждён живым прогоном, добавлен в `E2E_GATED_APPS` (§18.7, инфра)

Продолжение сессии 2026-07-18. BlackCove сообщил, что даже с фиксом `webServer` из вчерашней
сессии staging-прогон всё ещё тестировал локальный dev-сервер раннера, не задеплоенный
staging-контейнер — `> nx run time:dev` появлялся в логе `run_e2e` независимо от переданного
`BASE_URL`.

- **Настоящая причина — не синтаксис `webServer.command`.** У `apps/time-e2e` не было
  собственного `project.json` — таргет `e2e` собирался через inferred `createNodes`
  `@nx/playwright/plugin`, который разбирает `webServer.command` regex'ом
  (`node_modules/@nx/playwright/.../plugin.js`, `parseTaskFromCommand`) и матчит ОБЕ формы
  вызова — `nx run <app>:dev` и короткую `nx <app> dev`/`nx dev <app>` одним и тем же паттерном —
  после чего добавляет `dependsOn: [{project, target: 'dev'}]`. Смена синтаксиса команды не
  помогала, только явный `project.json`.
- **Фикс:** добавлен `apps/time-e2e/project.json` с `executor: '@nx/playwright:playwright'` —
  паттерн уже используют `aboi-e2e`/`grandslamcup-e2e` (единственный на тот момент реально
  гейтованный staging-app), полностью обходит inferred-инференс. Проверено через
  `nx show project time-e2e --json` (после полного сброса кэша Nx, включая daemon-stop — иначе
  граф отдаёт устаревший результат): `dependsOn` исчез, `executor` правильный.
- **Подтверждено живым прогоном BlackCove:** 3/3 passed за 8.2с, в логе `nx run time-e2e:e2e`
  напрямую, без прежней строки `nx run time:dev`.
- **Добавлен в `E2E_GATED_APPS`** — список не существовал в репозитории заранее (первая
  реализация), BlackCove создал его в `libs/infra-config/src/index.ts` рядом с `SERVER_APPS`
  (коммит `6af28c70`, с разрешения владельца).
- **Побочный фикс монорепо-уровня:** генератор `@letar/generators:e2e-suite` (используется для
  скаффолда новых e2e-сьютов) тоже не создавал `project.json` — все 6 его прошлых выходов
  (`animatrona-landing-e2e` и др.) унаследовали ту же уязвимость. Генератор теперь скаффолдит
  `project.json` по умолчанию; старые 6 не ретрофичены (не в скоупе, задокументировано в
  `.claude/docs/e2e-testing.md` как чеклист перед их будущим staging-гейтом).

Коммиты: `c034560e` (time-e2e project.json, letar root), `bbbcc396` (генератор + docs).
Тред agent-mail: `staging-e2e-gate-m1-aboi-time` (msg #573–#579).

---

## 2026-07-18 — Подключение к staging e2e-гейту: build fix + playwright.config fix (§18.7, инфра, вне тематики приложения)

Корневой `PLAN.md` §18.7 Тираж M1 — подключение `time` к staging-e2e-гейту. Первый
staging-деплой (BlackCove) упал на билде; после фикса деплой прошёл, но `time-e2e` не запускался
вообще из-за отдельного бага конфига.

- **Build failed:** `next build` использует собственный TS-чекер, который не полностью
  поддерживает project references (`tsconfig.json` → `references`) и ложно требовал, чтобы
  `libs/analytics/src/index.ts` (path-mapped импорт `@letar/analytics`) лежал внутри `rootDir`
  приложения. Фикс — `typescript: { ignoreBuildErrors: true }` в `next.config.js`, тот же
  паттерн уже у 14 других приложений монорепо (grandslamcup, kami, aboi, driving-school...) —
  типы проверяются отдельно `nx typecheck:tsgo` (у time чисто).
- **`time-e2e` не запускался на staging:** `playwright.config.ts` — `webServer.command: 'bun nx
run @letar/time:dev'` звал несуществующий nx-проект (реальное имя — `time`, `@letar/time` —
  это имя `package.json`); `webServer.url` был захардкожен на `localhost:3000` (дефолт
  генератора, не совпадает ни с реальным портом time — 3013, ни с `baseURL`) — из-за этого
  `reuseExistingServer` не видел уже поднятый staging-контейнер и пытался поднять несуществующий
  локальный dev. Плюс добавлен `locale: 'ru-RU'` — без него Chromium/WebKit шлют
  `Accept-Language: en-US`, next-intl отдаёт английский контент вместо `defaultLocale: 'ru'`.
- `example.spec.ts` — дефолтный Nx-плейсхолдер (`<h1>` с текстом "Welcome", такого элемента на
  главной странице `time` нет — она рендерит только `<Text>` со счётчиком часов) заменён на
  реальный смок-тест (проверка `<title>` + видимого текста часа).
- Локально 3/3 браузера (chromium/firefox/webkit) зелёные (`BASE_URL=http://localhost:3013
bunx playwright test`, минуя зависающий в dev-режиме `nx e2e`).
- Коммит `884ed211` (letar root). Подробности — корневой `PLAN.md` §18.7.

## 2026-07-12 — Живой пилот zero-downtime rollout пройден (§18.6 Сессия G, инфра, вне тематики приложения)

Продолжение записи ниже — супервизируемый прод-деплой через включённый `letar.rollout: 'true'`.

- 3 попытки деплоя, 2 найденных и закрытых бага в `libs/deploy-engine`: `requireApp()` падал на
  `--deploy-tag` из-за strict-режима `parseArgs` (commit `6618e3e`); `oldContainer` был
  захардкожен как `<project>-app-1`, не находил легаси-контейнер `time-app` без суффикса —
  добавлен `resolveOldContainer()` по compose-лейблам (commit `77d023b`)
- Финальный чистый ретрай (`deployId 1b6fd716`) — все 8 шагов rollout без единого ❌: `doctor` →
  `resolve-old-container` → `scale-up` → `wait-healthy` → `nginx-reload-1` → `stop-old` →
  `rm-old` → `nginx-reload-2`
- `time.letar.best` держал 200 OK весь пилот (независимо проверено двумя сторонами); multi-IP
  nginx-балансировка (временное сосуществование двух контейнеров после `nginx-reload-1`)
  подтверждена вживую без потери трафика
- DoD §18.6 Сессии G выполнен — подробности корневой `PLAN.md` §18.6

## 2026-07-12 — Compose-миграция под zero-downtime rollout (инфра-пилот, вне тематики приложения)

`time` выбран пилотом для `libs/deploy-engine` `rollout` (docker-rollout-паттерн, §18.6 Сессия G
корневого `PLAN.md`) — низкорисковое приложение, уже было пилотом сессий A/C того же трека.

- `docker-compose.production.yml`: убран `container_name`/`ports` у сервиса `app` (нужно для
  `docker compose --scale app=2`), добавлен network alias `time-app` на `kami-network`
  (сохраняет NPM Forward Host без изменений), `healthcheck` (профиль grandslamcup), `image` через
  `${DEPLOY_TAG:-latest}` (rollback без пересборки)
- По пути найден и устранён блокер: Dashboard резолвил контейнер приложения по точному имени —
  без `container_name` ломался мониторинг stats/logs/status для `time`. Фикс — отдельная запись в
  `apps/dashboard/PLAN_COMPLETED.md` (`findContainerByName`, версия 1.19.3)
- `doctor --app time` (`bun run libs/deploy-engine/src/cli.ts doctor --app time`) подтверждает
  6/7 required-проверок ✅ — не хватает только opt-in label `letar.rollout: 'true'`, оставлен
  закомментированным намеренно до супервизируемого живого пилота
- commit `8de3029`

## 2026-03-21

- Создано приложение (Next.js 16 + Chakra UI v3, порт 3013)
- Настроена тема (brand: синий, accent: фиолетовый, dark mode)
- Подключена Umami аналитика
- Зарегистрировано в инфраструктуре Dashboard

## 2026-07-10 — Пилот TypeScript 7 GA (инфра-тулинг, вне тематики приложения)

`time` выбран low-risk пилотом для проверки вышедшего стабильного `typescript@7.0.2` (Go-порт, GA 2026-07-08)
перед тиражом на весь монорепо. Подробности и план тиража — корневой `PLAN.md` §19.

- Добавлен nx-таргет `typecheck:ts7` (`bunx --bun typescript@7.0.2 --noEmit`) — изолированно от общего
  `node_modules/.bin/tsc`/`tsgo`, которыми пользуются остальные проекты
- Результат: вывод идентичен `tsc` 6.0.3 и `tsgo` dev-preview (одни и те же 4 pre-existing ошибки — не хватает
  сгенерённых Prisma-файлов); скорость 0.62s vs 2.71s (`tsc`) — паритет с уже используемым `tsgo`
- Найдена и задокументирована ловушка: обычный `bun install` пакета `typescript@7` в корневом `package.json`
  подменяет общий bin `tsc` для всего workspace молча, несмотря на алиас-имя зависимости
- commit `4698c97`

## 2026-08-06 — Фикс деплоя: P3018 на миграции `20260728041249_init` (BlackCove)

`migrate deploy` падал `relation "User" already exists` (42P07). Прод-схема (`User`,
`ConsentLog`, `NotificationLog`, `NotificationSubscription`, 1 реальная строка в `User`) уже
существовала, но не была записана в `_prisma_migrations` — похоже на `db push` при раннем
поднятии окружения. Сверка колонок/индексов/FK из `psql \d` с `migration.sql` дала точное
совпадение — не drift. Дамп прод-БД от неудачной попытки уже лежал в
`/home/deploy/pre-migrate-dumps/`. Разрешено через `prisma migrate resolve --applied
20260728041249_init` на s2. Повторный деплой прошёл (`exitCode 0`). Подробности — `PLAN-INFRA.md`
§46.

## 2026-08-07 — `tsconfig.json`: убраны references на libs/* (TS6305 + каскад TS7006)

Тот же баг, что чинили в `dashboard-agent` (публичный коммит `885ceaf2`) и `studio`/`svoichuzhie`
(та же сессия). 8 `references` на `../../libs/<name>` вели на solution-конфиг библиотек,
редиректящий в `out-tsc/spec/`, который не собирает ни один Nx-таргет — на чистом HEAD
`typecheck:tsgo` показывал 15 ошибок каскадом.

Убраны все 8 `references`. Приложение расширяет `tsconfig.next-app.json` — как и в `studio`,
`outDir` из пресета без явного `rootDir` заставляет tsgo вывести его как каталог приложения,
поэтому добавлено `"rootDir": "../.."` (корень монорепо).

После фикса `typecheck:tsgo` — 0 ошибок (лучше базовой линии в 15), `nx build time` — зелёный.
