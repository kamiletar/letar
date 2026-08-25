# План разработки auth-hub

## v0.7.13 — фикс typecheck: VK-провайдер перенесён в genericOAuth (2026-08-25)

- [x] **`nx typecheck:tsgo auth-hub` был красным** — better-auth 1.7 зарезервировал ключ `vk` в
      `socialProviders` под собственный OAuth 2.1/PKCE-провайдер (VK ID, тип `VkOption`/
      `VkProfile` из `@better-auth/core`), несовместимый со старым кастомным VK-провайдером
      (VK API 5.131, `clientSecret` + ручной `users.get`). Тот же баг уже чинили в
      `driving-school` (см. `apps/driving-school/PLAN_COMPLETED.md`) — здесь применён тот же
      фикс: VK-провайдер перенесён из `socialProviders.vk` в `genericOAuth({config: [...]})`
      рядом с Yandex (`src/lib/auth.ts`). Логика `getUserInfo` (VK API 5.131 users.get) не
      менялась, только точка регистрации. Вторая ошибка typecheck, ранее числившаяся отдельной
      (`TS2322` в `libs/auth/src/server/create-auth/index.ts`, `buildHubProviderAuth.plugins`),
      оказалась следствием этой же VK-несовместимости, не отдельным багом — `libs/auth` не
      правился, после фикса auth-hub чист сам по себе.
      Прогон: `nx run-many -t format --projects=auth-hub` → `nx lint auth-hub` →
      `nx typecheck:tsgo auth-hub` — все зелёные. Дополнительно прогнан `tsgo --noEmit` на
      остальных 8 потребителей `createAuth` (`driving-school`, `kami`, `domwellbes`, `time`,
      `aprel8008`, `dsperevod`, `svoichuzhie`, `aboi`) — `libs/auth` не менялся, поэтому фикс их
      не затрагивает; единственные красные ошибки в `domwellbes` (Chakra Card/Link/Button
      recipe-варианты) — предсуществующие, не про auth, не трогал.

- [x] ✅ **«Открытый вопрос» `/sign-in` не раскрывается из React-стриминга — закрыт как ложная
      тревога, не баг приложения (2026-08-25).** Причина — известная ловушка инструментов
      автоматизации (Browser pane / фоновая вкладка `claude-in-chrome`): вкладка, которую браузер
      реально не отрисовал ни одного кадра, живёт с `document.hidden === true` навсегда, а
      React-скрипт раскрытия стримингового `<Suspense>` (`$RC`/`$RB`/`$RV` для первого разрешённого
      boundary страницы) планирует финальный swap через `requestAnimationFrame`, который в таком
      состоянии не тикает вообще — не троттлится, а именно не срабатывает никогда, пока не случится
      настоящий композитинг. Подтверждено экспериментально: на зависшей `/sign-in` (`hiddenDivs:
      S:0,S:1,S:2`, все шесть `<input>` с `offsetParent:null`) один `computer{screenshot}` (форсирует
      реальную отрисовку кадра) мгновенно раскрыл все три границы без единого изменения кода —
      после скриншота `hiddenDivs` схлопнулся до одного не относящегося к делу div (cookie-баннер),
      все `<input>` получили `offsetParent`. `/sign-up` «работал» в прошлых проверках не потому что
      там нет этой уязвимости, а по случайности: любое действие, вызвавшее реальный рендер кадра
      (скриншот, наведение и т.п.) до момента проверки — снимает симптом.
      Практика: не диагностировать зависший стриминговый `<Suspense>` (`<div hidden id="S:N">`,
      `offsetParent:null` у контента) как баг приложения, не проверив `document.hidden` и не
      получив хотя бы один реальный composited-кадр (`computer{screenshot}` до проверки, не после).
      Тот же класс ошибки уже документирован в `.claude/docs/raf-vs-timers-background-tab.md` и
      частных доках по `libs/forms`/`form-example-e2e` — здесь третье по счёту подтверждение того же
      механизма, на этот раз ошибочно принятое за прод-баг уровня «страница входа полностью
      нефункциональна». Никакого изменения кода не потребовалось — `page.tsx`/`login-form.tsx`/
      `magic-link-form.tsx`/`oauth-buttons.tsx` и остальные компоненты `/sign-in` корректны как есть.

## v0.7.12 — живая проверка OIDC-флоу better-auth 1.7: два бага найдены и исправлены (2026-08-25)

- [x] **`createAuthClientWithOAuth` (`libs/auth/src/client/create-auth-client.ts`) терял почти
      весь клиент.** `{...client}` над Proxy-клиентом better-auth (пустой `ownKeys`-трап) молча
      терял `useSession`/`signOut`/`signIn.social`, оставляя только явно прописанный
      `signIn.oauth2`. Ломало ЛЮБОЙ hub-client, вызывающий `useSession()` —
      `TypeError: useSession is not a function` при первом рендере. Исправлено на настоящий
      `Proxy` с `Reflect.get` (коммит `6c9a009d`, вместе с сопутствующей типизацией
      `Option`-дженерика от параллельной сессии — итог сверен `nx run-many -t
      lint,typecheck:tsgo,test --projects=auth,auth-hub`, полностью зелёный).
- [x] **`apps/auth-hub/prisma/seed.ts` — `redirectUrls` всех 9 клиентов указывали
      несуществующий путь `/api/auth/oauth2/callback/<id>`.** Реальный колбэк
      generic-oauth-плагина — `/api/auth/callback/<id>` (`getOAuthCallbackPath`); сегмент
      `oauth2/` есть только у провайдерских эндпоинтов самой Ключницы. Исправлены все 9
      клиентов, пересеяно (коммит `b421da79`). Без фикса `oauthProvider()` отклонял бы
      `redirect_uri` любого hub-client в проде.
      Подробности обоих багов — [better-auth-1.7-oidc-provider-removed.md](/.claude/docs/better-auth-1.7-oidc-provider-removed.md#живая-проверка-2026-08-25--два-реальных-бага-найдены-и-исправлены).
- [x] **Подтверждено живьём:** discovery-документ (`/.well-known/openid-configuration`) отдаёт
      корректные OAuth 2.1 endpoints с JWT/EdDSA-подписью — связка `oauthProvider()`+`jwt()`
      реально поднимается и работает.
- [ ] ⚠️ **Открытый вопрос: полный клик-через (login → consent → редирект с токеном в
      hub-client) так и не подтверждён живьём.** Заблокировано перегрузкой машины — параллельные
      сессии держали 228→265 node-процессов, dev-серверы `auth-hub`/`archetest`/`time` падали
      через секунды после старта на каждой из нескольких попыток за две сессии подряд. Повторить
      на менее нагруженной машине (или в окно с меньшим числом параллельных агентов):
      `nx dev auth-hub` + `nx dev archetest` (или `time` — есть отдельный незакрытый
      `ContextError`/ChakraProvider баг в `apps/time`, не связан с этой миграцией, найден
      случайно и не чинился, см. ниже).
- [ ] ⚠️ **Открытый вопрос: `ContextError` в `apps/time` Toolbar (не связан с OIDC-миграцией).**
      При тестировании OIDC на `time` после фикса `useSession` вскрылась отдельная ошибка —
      `useContext returned undefined... forgot to wrap in ChakraProvider` в
      `apps/time/src/app/_components/toolbar.tsx`. `providers.tsx`/`[locale]/layout.tsx`
      структурно оборачивают `Toolbar` в `ChakraProviders` — беглый просмотр причину не выявил.
      Не исследовано глубже (не в скоупе OIDC-задачи), маскировалось багом `useSession` до этой
      сессии.

## v0.7.11 — формы sign-in переведены на @letar/forms (2026-08-25)

- [x] **`login-form.tsx` и `magic-link-form.tsx` нарушали правило репозитория** (запрет
      нативного `<form>` + ручного `FormData`/`useState` вместо `@letar/forms`, см.
      `.claude/rules/forms.md`). Инстанс `AuthHubForm` (`src/auth-hub-form/`) уже существовал
      и уже использовался в `add-email-form.tsx` — образец переиспользован без изменений.
      **login-form:** `AuthHubForm.Field.String` (email, `autoComplete="username webauthn"`
      для passkey-дропдауна) + `AuthHubForm.Field.Password` (встроенный toggle видимости —
      убрал ручной `IconButton`/`showPassword`). Валидация через существующую `LoginSchema`,
      ручной `FormData`+`safeParse` в `onSubmit` убран — форма валидирует сама. Состояния
      `error`/`info`/`pendingEmail` и вызов `loginUser` — без изменений, `usePasskeyConditionalAuth`
      не тронут. Убран ручной `loading`-стейт — `AuthHubForm.Button.Submit` сам показывает
      спиннер по `isSubmitting`.
      **magic-link-form:** новая локальная Zod-схема `MagicLinkSchema` (одно поле `email`),
      `sendMagicLinkAction` вызывается из `onSubmit`. Состояния `idle`/`sent`/`error` сохранены
      (`loading` больше не нужен — спиннер кнопки автоматический).
      `nx typecheck:tsgo auth-hub`/`nx lint auth-hub` — зелёные (2 предсуществующие ошибки
      typecheck в `src/lib/auth.ts`/`libs/auth` — VK OAuth-провайдер, не связаны с этой правкой).
      Полная визуальная проверка кликом не удалась — не по вине этой правки: `/sign-in`
      целиком не раскрывается из React-стриминга (см. открытый вопрос выше, найдено и
      подтверждено A/B-тестом уже после первого прохода этой задачи). На момент первой проверки
      SSR ещё падал на `genericOAuthClient is not a function` (закрыто другой сессией в процессе
      этой же сессии); после её фикса вскрылась вторая, более глубокая проблема.

## v0.7.10 — фикс кнопки magic-link: hydration mismatch убивал интерактивность (2026-08-25)

- [x] **Кнопка «Отправить ссылку для входа» на `/sign-in` не реагировала на клик у части
      пользователей.** Репродукция через Browser pane на свежей вкладке (не кеш): в консоли
      `Minified React error #418` (`args[]=HTML`) сразу при загрузке, клик по кнопке после этого
      не порождал вообще никакого сетевого запроса. `project.json` не имел явных `build`/`dev`
      таргетов → Nx-инференс `@nx/next` выбирал Turbopack по умолчанию — известная комбинация
      Turbopack + Emotion `Global` + `next-themes` script в `ColorModeProvider`
      ([nextjs16-turbopack-default-emotion-hydration.md](/.claude/docs/nextjs16-turbopack-default-emotion-hydration.md)),
      ранее пофикшена в `mandala`/`studio`/`dashboard`/`driving-school`, но не в `auth-hub`.
      **Фикс:** `--webpack` override для `build`/`dev` в `project.json` (коммит `bf690f5d`).
      GlitchTip подтвердил тот же мисматч и на `/oauth/consent` у реального пользователя (не
      только на `/sign-in`) — баг не ограничивался одной страницей.
      **Побочная находка (не код-фикс, отдельно зафиксирована для видимости):** в том же разборе
      GlitchTip (issue `AUTH-HUB-3`, «Failed to find Server Action») найден payload,
      похожий на массовое интернет-сканирование известной уязвимости десериализации Next.js
      Server Actions (recon-скрипт, читающий `.env`/SSH-ключи/облачные credentials через
      `eval()`). Next.js отбраковал запрос на этапе поиска экшна по невалидному
      `$ACTION_REF_0` — до десериализации payload'а, эксплуатация не подтверждена. Требует
      мониторинга, не блокирует этот фикс.
- [ ] ⚠️ **Открытый вопрос: коммиты не запушены в origin.** Пользователь явно попросил не
      пушить в этой сессии. Deploy-request отправлен `deploy-agent-dev` (2026-08-25) с пометкой
      «не запушено» — деплой не состоится, пока кто-то не запушит `main` (коммиты
      `bf690f5d`/`58de7e73`/`966a001c`) и/или пользователь явно не разрешит push.

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
      **Фикс:** `test.skip(!isLocalDev, ...)` в начале describe-блока (коммит `7a8afe62`).
      Требует dev-БД (`NODE_ENV=development`, `requireEmailVerification=false`), на staging/prod
      сборке не работает — теперь пропускается явно, а не падает.
      **Повторный прогон 2026-08-25 — полностью зелёный:** `expected: 10, skipped: 2, unexpected: 0`,
      exitCode 0. `auth-hub` добавлен в `E2E_GATED_APPS` (`libs/infra-config/src/index.ts`).
      DoD §18.7 M4 для auth-hub выполнен, warn-only минимум неделю перед тем, как рассчитывать на
      гейт как на реальную защиту. Остаётся `driving-school` — второе и последнее приложение M4.

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
