# План разработки auth-hub

## §18.7 M4: первый живой прогон staging e2e — закрыто (2026-08-25)

- [x] **Первый деплой + полный e2e-прогон auth-hub на staging.** Деплой ✅ (коммит `82ebb75e`,
      контейнер healthy за 9с). E2E: `01-public`/`02-admin`/`03-oidc-authorize` — 10/10 ✅.
      `04-linked-email-login.spec.ts` — 0/2 ❌, но не по ожидаемой причине
      (`requireEmailVerification`). Упало раньше, в `beforeAll`: прямой `fetch()` из Node-процесса
      Playwright (без браузерного контекста) в `/api/auth/sign-up/email` не несёт заголовка
      `Origin` → better-auth отвечает `403 MISSING_OR_NULL_ORIGIN`. Плюс отдельная находка —
      `afterAll`-cleanup падал на `Cannot find module '@letar/e2e-testing/prisma-cjs-wrapper'`
      (не диагностировано глубже, не актуально после фикса ниже).
      **Корень:** докстринг файла с самого начала (Этап 8.5, v0.6.4) заявлял «не запускается в
      staging-раннере», но фактической проверки в коде не было — `playwright.config.ts` держит
      единственный project (`chromium`) без dev/staging-разделения, в отличие от эталонного
      паттерна `driving-school-e2e` (`testIgnore: /^staging\//` + отдельный `staging/`-каталог).
      **Фикс:** `test.skip(!isLocalDev, ...)` в начале describe-блока — коммит после этой записи.
      Требует dev-БД (`NODE_ENV=development`, `requireEmailVerification=false`), на staging/prod
      сборке не работает — теперь пропускается явно, а не падает.

## Текущий статус: v0.7.6 — задеплоено, фикс «Неизвестная ошибка» при re-auth под другим аккаунтом (2026-08-20)

> **2026-08-20:** прод-инцидент — вход под другим аккаунтом (account chooser, `prompt=login`)
> для studio-prod показывал «Ошибка входа: Неизвестная ошибка», хотя сессия реально создавалась.
> Root cause, фикс и детали побочного инцидента деплоя (`@swc/helpers` crash-loop, устранён в
> 0.7.6) — [PLAN_COMPLETED.md](./PLAN_COMPLETED.md#075--076-прод-инцидент--ложная-неизвестная-ошибка-при-re-auth-под-другим-аккаунтом-2026-08-20).
> Задеплоено на s2, коммит `a267bbb6`.

- [ ] ⚠️ **Открытый вопрос: фикс 0.7.5 не проверен вживую через браузер.** Верифицирован только
      по прод-логам контейнера и содержимому Redis (совпадение `createdAt` сессии с меткой
      времени ошибки) — не через реальный клик «Войти под другим аккаунтом» → ввод пароля →
      проверка, что происходит редирект на studio-prod без ошибки на экране. Стоит проверить
      руками при следующей сессии над auth-hub или account chooser.

> **Сверка 2026-07-30 (аудит сессии auth-hub-dev):** оба оставшихся крупных блока плана давно
> реализованы, но не были отмечены — «v0.4.0 Возврат на исходный сайт» (коммиты `71a20875`
> 2026-05-28 + фикс `6dec3013` 2026-06-05) и «v0.5.0 RP-Initiated Logout» (`78340e8a`
> 2026-05-29, тираж на 6 hub-client приложений `97752db8` 2026-06-06). Версии 0.6.5–0.7.3 —
> см. [CHANGELOG.md](./CHANGELOG.md) и [PLAN_COMPLETED.md](./PLAN_COMPLETED.md).
> Прод-инцидент `auth-hub-prod-500` (500 на всех better-auth роутах, 2026-07-29) закрыт
> re-seed'ом BlackCove 2026-07-30: discovery/get-session/sign-in отвечают 200 (проверено curl).
> `/api/auth/jwks` → 404 — штатно (HS256, jwt-плагин не подключён), не путать с багом.

## Бэклог — техдолг (2026-08-19, не в работе)

- [ ] Заменить `transition="all 0.15s"` на явный `transitionProperty` (сужает анимацию до реально
      меняющихся свойств вместо любого изменения пропа при ре-рендере) —
      `src/app/oauth/consent/_components/account-chooser.tsx`. Паттерн фикса и разбор — в
      [interactive-press-feedback.md](/.claude/docs/interactive-press-feedback.md)

## Статус (ранее): v0.6.4 — Этап 8.5: вход по любому linked-email ✅ (Этап 8.5 закрыт целиком)

Детали — [PLAN_COMPLETED.md](./PLAN_COMPLETED.md#версия-064--2026-07-16-этап-85-вход-по-любому-linked-email).

## Бэклог — находки сессии v0.6.4 (2026-07-16, не в работе)

- [x] **🔴 Утечка пароля в URL до hydration — ЗАКРЫТ (2026-07-16)** — `(auth)/sign-in/_components/login-form.tsx`:
      форма без `method="post"`/`action` до гидрации React сабмитится нативным GET —
      email+пароль попадают в URL (history, access-логи, Referer). Воспроизведено вживую.
      **Аудит монорепо подтвердил находку и расширил скоуп:** проблема оказалась не только
      кросс-приложенческой, но и системной — оба корневых `<form>` в `@letar/forms`
      (`FormSimple`, `FormWithApi`) тоже были без `method="post"`, т.е. риску подвержены
      **все** приложения на библиотеке (включая driving-school), не только точечные raw-формы.
      **Пофикшено `method="post"` в 15 местах:** `libs/forms` (2 корневых компонента — закрывает
      driving-school и будущих потребителей), auth-hub (sign-in/sign-up/change-password),
      aboi (sign-in/sign-up/reset-password), dsperevod (sign-in/sign-up/reset-password),
      svoichuzhie (login/fanclub-join/2FA-подтверждение паролем ×2). mandala/animatrona-tracker
      уже были на `@letar/forms` (закрыты фиксом библиотеки). Typecheck зелёный на всех
      затронутых проектах; lint-ошибки в диффе — только pre-existing долг несвязанных файлов.
      Коммиты: `8ea8b30` (forms), `29aaabd` (auth-hub), submodule-коммиты aboi `e475d5f`,
      dsperevod `14d2c0b`, svoichuzhie `3a8703a`, bump SHA `b9eaa2a`.
- [x] **Хрупкий парсинг ошибок Better Auth — ЗАКРЫТО (2026-07-30)** — `login.action.ts`:
      маршрутизация «вход vs авторегистрация» держалась на `message.includes('invalid')` и
      т.п. Изучены исходники `better-auth`/`@better-auth/core` (bun cache): все ошибки sign-in
      бросаются с фиксированным `body.code` (`INVALID_EMAIL_OR_PASSWORD`, `EMAIL_NOT_VERIFIED`),
      sign-up — `USER_ALREADY_EXISTS[_USE_ANOTHER_EMAIL]`/`PASSWORD_TOO_SHORT`/`PASSWORD_TOO_LONG`.
      Переведено на проверку `apiCode`/`signUpCode` вместо текста сообщения. typecheck+lint зелёные.
- [x] **Hydration-«нестабильность» `/sign-in` — ЗАКРЫТО, не баг (2026-07-30)** — консольное
      «Encountered a script tag while rendering React component» оказалось НЕ Telegram-виджетом:
      источник — `ColorModeProvider` (`next-themes`), который намеренно рендерит блокирующий
      `<script>` для защиты от FOUC (см. `.claude/docs/ui-components.md`). Воспроизведено на `/`
      и `/sign-in` — предупреждение сайт-wide на любой странице с `ColorModeProvider`, безвредно,
      функциональность не страдает. Чинить нечего — переход на `next/script` сломал бы защиту от
      FOUC. Задокументировано в ui-components.md, чтобы не путать с реальным багом повторно.
- [x] **Нет vitest-инфраструктуры — ЗАКРЫТО (2026-07-30)** — добавлены `vitest.config.ts`
      (environment: node), `tsconfig.spec.json` + reference по образцу archetest
      (`.claude/docs/unit-testing.md`), target `test` в `project.json`. Первый тест —
      `resolve-login-email.spec.ts` (4 кейса: без linked-адреса, приоритет primary над linked,
      резолв подтверждённого linked-email, игнор неподтверждённого). `nx test auth-hub` зелёный.
- [x] **E2e не покрывает linked-email вход — ЗАКРЫТО (2026-07-30)** — `04-linked-email-login.spec.ts`
      в auth-hub-e2e: primary-аккаунт через реальный sign-up API, linked-email — прямой вставкой
      через новые `helpers/db.helpers.ts` (по образцу driving-school-e2e). Проверено вживую вручную
      (curl sign-up + browser-check формы входа) — сессия резолвится под primary-аккаунтом,
      неверный пароль не создаёт дубль. Работает только на локальном dev-раннере
      (`requireEmailVerification=false` вне `NODE_ENV=production`) — не на staging/prod as-is.
      Донастройка `AUTH_GOOGLE_ID/SECRET` в `.env.staging` для OAuth-тестов остаётся отдельной
      будущей задачей, если такие тесты появятся.

## Текущий статус (ранее): v0.6.3 — Этап 8.5: merge двух аккаунтов ✅ (скрипт готов, прод-запуск не выполнялся)

Детали — [PLAN_COMPLETED.md](./PLAN_COMPLETED.md#версия-063--2026-07-16-этап-85-merge-двух-аккаунтов)
и [v0.6.2](./PLAN_COMPLETED.md#версия-062--2026-07-16-этап-85-self-service-несколько-email-на-аккаунт).

## Текущий статус (ранее): v0.6.1 — Фикс OIDC invalid_grant (Redis secondaryStorage) ✅

Детали v0.6.0 (Admin UI + at-rest шифрование, деплой + backfill) —
[PLAN_COMPLETED.md](./PLAN_COMPLETED.md#версия-060--2026-06-15-этап-8-admin-ui--at-rest-шифрование).

---

## v0.5.0 — Миграция на `createAuth({ mode: 'hub-provider' })` ✅

### Выполнено (v0.5.0)

- [x] `auth.ts` мигрирован на `createAuth({ mode: 'hub-provider' })` (~401 → ~205 строк без хелперов)
- [x] `@letar/auth` v0.7.0: `buildHubProviderAuth`, `OidcProviderConfig`, 8 новых тестов hub-provider

---

## v0.4.0 — Возврат на исходный сайт при смене аккаунта ✅ (реализовано 2026-05-28)

Спека и детали реализации перенесены в [PLAN_COMPLETED.md](./PLAN_COMPLETED.md#v040--возврат-на-исходный-сайт-при-смене-аккаунта--реализовано-2026-05-28).

---

## v0.5.0 — Глобальный выход: RP-Initiated Logout ✅ (реализовано 2026-05-29…06-06)

Спека и детали реализации перенесены в [PLAN_COMPLETED.md](./PLAN_COMPLETED.md#v050--глобальный-выход-rp-initiated-logout--реализовано-2026-05-2906-06).

---

### Выполнено (v0.3.0)

- [x] Account chooser (как у Google) для всех trusted OIDC clients
  - `skipConsent: false` для archetest/time/grandslamcup/kami/animatrona-tracker/dashboard
  - `/oauth/consent` переделана: server component + `AccountChooser` client component
  - 3 действия: «Продолжить как X», «Войти под другим аккаунтом», «Отмена»
  - Смена аккаунта: `signOut` + redirect на `/sign-in?<OIDC params>` → `usePostSignInCallback` продолжает OIDC flow

## Предыдущие версии

### Выполнено (v0.1.0)

- [x] Настройка Better Auth с OAuth провайдерами (Google, GitHub, VK, Яндекс)
- [x] Вход по email/password с авто-регистрацией
- [x] Magic Link вход
- [x] OIDC Provider для клиентских приложений (archetest, time, grandslamcup)
- [x] SMTP отправка писем (верификация, magic link)
- [x] Главная страница с профилем пользователя и кнопкой выхода

### Выполнено (v0.1.1)

- [x] Привязка дополнительных способов входа к аккаунту (OAuth linking)

### Выполнено (v0.2.0)

- [x] Страница настроек профиля `/profile/settings` — редактирование имени
- [x] Управление ролями в админ-панели (ADMIN/USER toggle)
- [x] Объединённая страница профиля `/profile` — карточка + навигация + выход
- [x] Навигация «← Профиль» на всех подстраницах
- [x] Исправлена установка пароля для OAuth-пользователей (auth.api.setPassword)
- [x] Зарегистрированы kami и animatrona-tracker как OIDC trusted clients
- [x] Миграция kami — OIDC + кнопка «Войти через Ключницу» + accountLinking
- [x] Миграция animatrona-tracker — OIDC + кнопка «Войти через Ключницу» + accountLinking
- [x] Кнопка «Аккаунт в Ключнице» в user-меню: archetest, time, grandslamcup, kami, animatrona-tracker

- [x] Миграция dashboard — OIDC + только кнопка Ключницы + роли USER/VIEWER/ADMIN
- [x] SSO между приложениями — вариант B (silent re-auth) через trusted OIDC clients

### Не планируется (собственная авторизация)

- driving-school, imot, premium-rosstil — standalone Better Auth, миграция на OIDC не нужна

## Техдолг: подключить theme:check

Гейт сырых цветов/теней/transition в UI-коде (`nx g @letar/generators:theme-check-integrate
auth-hub`, генератор `libs/generators`, обёртка над `@letar/theme-check`) пока не подключён. Уже
подключено: domwellbes, studio, aboi. Подключать по одному, не пакетно — allowlist легитимных
исключений собирается руками при первом прогоне. Разбор —
`.claude/docs/theme-hardcode-gate-coverage.md`.
