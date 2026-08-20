# Выполненные задачи — Kami

## Matcher next-intl через @letar/i18n-proxy — исправлен пропущенный icon.svg (2026-08-21)

**Уточнение предыдущей записи ниже: аудит от 2026-08-21 был ошибочным.** `src/app/icon.svg`
физически существует (с 2026-05-15) — в аудите его не заметили. Next.js metadata route convention
отдаёт `icon.*` (любое расширение файла-источника, включая `.svg`) на URL `/icon` БЕЗ расширения
(кэш-бастинг через query), поэтому dot-wildcard `.*\\..*` его не ловит — тот же класс бага, что и
в studio, просто не был обнаружен предыдущим аудитом. Обнаружено `findUndeclaredMetadataRoutes` из
новой `@letar/i18n-proxy` (`libs/i18n-proxy`) при переносе matcher'а на `buildIntlMatcher()`.
Добавлен `src/proxy.spec.ts`, ловит такой рассинхрон впредь без ручного аудита.

## Аудит matcher proxy.ts — баг studio не подтвердился (2026-08-21, ОШИБОЧНО — см. запись выше)

Проверка класса бага из apps/studio. В kami единственный metadata-роут без своей
`[locale]`-вложенности — `src/app/manifest.ts`, но он отдаёт `/manifest.webmanifest`: точка в URL
есть, dot-wildcard-исключение `.*\\..*` matcher'а её ловит штатно. `icon`/`apple-icon`/
`opengraph-image`/`twitter-image` в приложении нет. Изменений не потребовалось.

## Аудит дублей по монорепо: локальный useReducedMotion → @letar/hooks (2026-08-20)

`src/app/_hooks/use-reduced-motion.ts` дублировал `useMediaQuery(breakpoints.prefersReducedMotion)`
из `@letar/hooks` один в один (реактивный хук с подпиской на `change`). Удалён, единственный
потребитель `matrix-rain.tsx` переключён на общий хук. `@letar/hooks` добавлен в
`tsconfig.json` `paths` и `package.json` `implicitDependencies` — раньше в kami не использовался.
v0.33.4.

## Проверка setRequestLocale/SSG (2026-08-19)

Аудит по классу бага, найденному в apps/studio. Полный аудит всех ~45 страниц `[locale]/`:
временно добавлен `setRequestLocale` в 5 кандидатов, но `next build` показал, что маркер не
изменился ни для одной страницы, включая уже имевшие `setRequestLocale`. Найден настоящий root
cause: корневой `[locale]/layout.tsx` безусловно вызывает `getSession()` → `headers()`
(Dynamic API Next.js) для шапки/`UserProvider` на каждой странице сайта — SSG невозможен, пока
это не изменится. Правки отменены (не оставлять `setRequestLocale` без эффекта), находка с
вариантами решения задокументирована в PLAN.md.

## GlitchTip + первичный staging + фикс Keystatic на NODE_ENV (2026-08-12)

Подключение к GlitchTip (`nx g @letar/generators:glitchtip-integrate kami`, PLAN-INFRA.md §70) —
`instrumentation.ts`/`instrumentation-client.ts`, DSN проекта id=17 в `.env.docker.enc`.

Заодно заведён **первый staging для kami вообще** (§18.7 Тираж M2) — раньше не было ни
`docker-compose.staging.yml`, ни `.env.staging.enc`, ни домена в Traefik. `kami-stage.s3.letar.best`,
порты 5467 (DB)/3034 (app). OIDC (Ключница)/Keystatic GitHub Storage/Telegram/Yandex Metrica на
стейдже сознательно не настроены — `kami-e2e` (5 спеков) тестирует только публичные страницы.

При первом staging-деплое `next build` падал целиком (не просто скрывалась кнопка входа, как у
OIDC) — `keystatic.config.ts` определял `storage: 'github'` через `NODE_ENV === 'production'`,
а `NODE_ENV` всегда `production` в собранном билде, включая стейдж (см.
`.claude/rules/env-files.md` § «NODE_ENV === 'production' — та же ловушка бьёт не только
секреты»). Решение владельца — graceful degradation, не отдельный GitHub OAuth App для стейджа:
условие заменено на `Boolean(process.env.KEYSTATIC_GITHUB_CLIENT_ID)` — билд не зависит от
домена/окружения, только от факта наличия кредов.

Попутно: `kami-e2e` не имел `project.json` (полагался на Nx-инференс через
`@nx/playwright/plugin`, который добавляет `dependsOn` на dev-таск до проверки `webServer.url`) —
заведён явный `executor: '@nx/playwright:playwright'`, тот же паттерн, что у `time`/`aboi`/
`grandslamcup-e2e` (найдено 2026-07-19).

## tsconfig.json — убраны `references` на `libs/*`, добавлен явный `rootDir` (2026-08-07)

Убраны 10 ссылок на `../../libs/*` из `references` (тот же хрупкий редирект на
`tsconfig.spec.json`/`out-tsc/spec`, что чинили в `dashboard-agent` 0.11.1 — см.
`.claude/rules/libs.md`). После удаления `references` библиотеки резолвятся напрямую по
исходникам через `paths`, что и обнажило второй слой проблемы: `kami` наследует `outDir` из
общего `tsconfig.next-app.json`, а через цепочку `tsconfig.base.json` — ещё и `composite: true`.
Composite-режим требует, чтобы `rootDir` содержал ВСЕ файлы программы, а TypeScript вычисляет его
по `include`-паттернам приложения (только `apps/kami/src`), не по фактически включённым файлам —
поэтому любой файл из `libs/*`, попавший в программу напрямую (без project reference), даёт
`TS6059: File is not under 'rootDir'`. Фикс — явный override `"rootDir": "${configDir}/../.."` в
`apps/kami/tsconfig.json`, расширяющий rootDir до корня монорепо. `declaration`/`outDir` не
трогали — `noEmit: true`, реальную сборку делает `next build`. `nx typecheck:tsgo kami` зелёный;
`nx build kami` падает на несвязанной проблеме (`ECONNRESET` к `api.github.com` — нет сети в
песочнице для Keystatic GitHub-хранилища, см. `.claude/rules/env-files.md` про `NODE_ENV`), не
регрессия от этой правки.

## Локальный `nx build kami` разблокирован: недостающие env-переменные Keystatic (2026-08-05)

`nx build kami` падал на этапе Collecting page data — сначала из-за Turbopack-трейсинга ФС в
`@letar/image-upload/server` (фикс см. корневой `PLAN.md` §32), затем, после устранения этого
бага, на `Failed to collect page data for /api/keystatic/[...params]`: не хватало
`KEYSTATIC_GITHUB_CLIENT_ID`/`KEYSTATIC_GITHUB_CLIENT_SECRET`/`KEYSTATIC_SECRET`.

Причина в целом классе ошибки из `.claude/rules/env-files.md` — `NODE_ENV` на `next build`
**всегда** `production`, поэтому и `keystatic.config.ts` (`storage: isProd ? 'github' : 'local'`),
и `src/lib/keystatic.ts` (`reader` через `createGitHubReader` на проде) используют GitHub-хранилище
даже при локальной сборке, а не только на реальном проде.

- Добавлены в `apps/kami/.env.local` (не коммитится, прод-значения из уже расшифрованного
  `.env.docker`): `KEYSTATIC_GITHUB_CLIENT_ID`, `KEYSTATIC_GITHUB_CLIENT_SECRET`,
  `KEYSTATIC_SECRET`.
- После этого `generateStaticParams` в `/blog/[slug]` начал падать на 403 `API rate limit
  exceeded` — `createGitHubReader` без токена бьёт в анонимный лимит GitHub REST API. Добавлен
  `GITHUB_PAT` (тоже прод-значение) — тот же токен, что `reader.ts` подставляет как
  `token: process.env.GITHUB_PAT`.
- `nx build kami --skip-nx-cache` теперь проходит целиком без флагов/обходов.

### Урок

Все четыре переменные нужны локально не потому, что разработка «превратилась в прод», а потому
что сам факт вызова `next build` включает прод-ветку конфига Keystatic. Любое приложение, где
`isProd`/аналог завязан на `NODE_ENV`, потенциально требует прод-секретов для одной лишь
локальной сборки — не только для реального деплоя.

## Версия 0.33.1 — чистка мёртвых demo-ссылок в портфолио (2026-07-28)

Найдено при повторном аудите хвостов decommission `imot`/`premium-rosstil`
(`apps/dashboard-agent/PLAN.md`, раунд 2): `prisma/seed.ts` отдавал `demoUrl` на decommissioned
`https://premium.rosstil.ru/` и `https://imot.letar.best` — реальный битый UX на живом портфолио,
не просто косметика. `demoUrl` убран у обеих карточек, описание/технологии оставлены как история
портфолио. Seed idempotent (`deleteMany`+`createMany`), но re-seed прод-БД kami не выполнялся —
если демо-ссылки уже в проде, нужен отдельный запуск сида с согласия владельца.

## Версия 0.33.0 — 152-ФЗ: CookieBanner+ConsentLog, consent-aware аналитика (2026-07-28)

Часть кросс-приложенческого аудита 152-ФЗ (root `PLAN.md`, Этап 0.8, сессия root-weaver). Страница
`/privacy` уже была, но не было ни cookie-баннера, ни `ConsentLog`, а Yandex Metrika/Umami грузились
безусловно, до согласия. Добавлено:

- `ConsentLog` в `schema.zmodel` + миграция (`prisma/migrations/20260728033244_add_consent_log`)
- `POST /api/consent`
- `CookieBanner`/`CookieSettingsButton` из `@letar/ui`
- `umami-script-consent.tsx`/`yandex-metrika-consent.tsx` — аналитика инициализируется только после
  `analytics: true` в согласии (слушают `kami:consent-change`, читают localStorage при монтировании)

## Версия 0.32.0 — Pressable-компоненты + тач-фидбек (2026-06-21)

### Что сделано

**Архитектура:**

- `pressable.tsx` → стал re-export из `@letar/ui` (удалена inline-реализация ~70 строк)
- `theme-provider.tsx` → `pressableConfig` из `@letar/ui` заменил inline `keyframes`+`globalCss`; `() => {}` → `() => undefined` (lint)
- Созданы `ui/button.tsx` (re-export `PressableButton as Button`) и `ui/app-link.tsx` (~27 строк, next-intl `Link` + `Pressable`)

**Компоненты переведены:**

- `nav-links.tsx` → `AppLink` (5 навигационных ссылок, удалён `Button asChild + Link`)
- `sign-in-button.tsx` → `Button` из `@/app/_components/ui/button`
- `mobile-menu.tsx` → `AppLink` для nav-пунктов + `Pressable` вокруг `Drawer.Trigger > IconButton` (бургер)
- `social-links.tsx` → `ExternalLink` (4 иконки: GitHub, Facebook, Telegram, Email)
- `projects/page.tsx` → `Pressable` вокруг demo/code кнопок (Server Component)
- `hero.tsx` — импорт из `@/app/_components/pressable` сохранён (работает через re-export)

**iOS-фикс:** `useEffect(() => { document.addEventListener('touchstart', () => undefined, { passive: true }) }, [])` в `theme-provider.tsx`

### Технические детали

- Typecheck: чистый (кроме 4 pre-existing ошибок: `unique symbol` + yandex-metrika)
- Lint: 1 pre-existing warning (`no-console` в другом файле), 0 errors
- `@letar/ui` 0.5.0: `nx typecheck ui` генерирует `.d.ts`, без этого tsgo не видит новые экспорты

---

Детальное описание всех реализованных фич.

## Версия 0.31.0 — Glassmorphism кнопки (2026-06-21)

### Chakra-theming: glassmorphism для outline-кнопок

- В `theme-provider.tsx` добавил стили в recipe `button` → variant `outline`:
  `bg: { base: 'white/15', _dark: 'transparent' }` + `backdropFilter: { base: 'blur(10px)', _dark: 'blur(8px)' }`
- Убрал дублирующие инлайн-стили с кнопок "Скачать" / "Все аудио" в `audio-page-client.tsx`
- Все `<Button variant="outline">` во всём приложении (57 файлов) теперь получают glassmorphism автоматически из рецепта

---

## Версия 0.10.0

### Реализовано

- Платформа для работы с контентом
- Управление знаниями

---

## Версия 0.28.0

### Фаза 7, Этап 1: Кросс-постинг Telegram + VK

- Модели SocialPlatform (тип, имя, enabled, config Json) и CrossPost (postSlug, platform, status, externalId/Url, error)
- Enum SocialPlatformType (8 платформ), CrossPostStatus (PENDING, PUBLISHED, FAILED)
- Сервис telegram.ts — публикация через Telegram Bot API с поддержкой прокси (tg-proxy.letar.best)
- Сервис vk.ts — публикация через VK API wall.post (v5.199)
- Server Actions: publishPost, retryPost, getPostPublications, getEnabledPlatforms
- Admin /social — таблица платформ с иконками, переключателем enabled, счётчиком публикаций
- Admin /social/logs — таблица CrossPost записей с фильтрами по статусу (PENDING/PUBLISHED/FAILED), пагинацией
- PublishButton — клиентский компонент на странице блог-поста (выбор платформ, публикация, статус)
- Пункт «Соцсети» в admin sidebar с иконкой Share2

---

### Рефакторинг: sharp-обработка загрузки изображений вынесена в `@letar/image-upload/server`

`createImageRecord`/`processImageBuffer` (`src/lib/images/create-image.ts`) дублировали sharp-код
с `aboi`, `mandala` и `domwellbes` — декодирование буфера, метаданные, генерация `blurDataURL`.
Общая часть выделена в `processUploadImage()` (`libs/image-upload/src/server/process-upload-image.ts`),
`processImageBuffer` (реэкспортируется из `src/lib/images/index.ts`) теперь тонкая обёртка над
ней с сохранённым поведением (try/catch → null при ошибке, blurDataURL 10×10/blur 1/WebP q20 по
умолчанию).

### Рефакторинг: CRUD Image и POST/DELETE /api/upload вынесены в @letar/image-upload/server

Продолжение предыдущего пункта. `create-image.ts` был на 100% идентичен `mandala` (кроме импорта
Prisma/ZenStack-клиента) — вынесен в `createImageRepository()`. `POST`/`DELETE /api/upload`
дублировались с `mandala` байт-в-байт (различалась только проверка роли: `role` vs `roles[]`) —
вынесены в `createImageUploadRoute()`. Оба файла в kami теперь только декларативная сборка опций
(сессия, `isAuthorized`, репозиторий, `getImageUrl`), логика — в библиотеке.

---

## 2026-08-06 — Фикс деплоя: OOM при сборке на s2 (BlackCove)

`nx build kami` дважды падал SIGKILL на s2 ровно на ~6.5 минуте. Причина — Turbopack
(production build по умолчанию в Next 16) работает нативным Rust-процессом вне V8-хипа,
`NODE_OPTIONS=--max-old-space-size` его не ограничивает; на s2 было всего 4.5GB свободной RAM.
`build`-таргет в `project.json` переопределён на `next build --webpack` (тот же паттерн, что уже
у dashboard/grandslamcup/archetest/studio). Локально webpack компилируется за 79с, на s2 — за
3.8 мин без падения. Деплой прошёл (`exitCode 0`). Подробности — `PLAN-INFRA.md` §46.

---

**Последнее обновление:** 2026-08-06
