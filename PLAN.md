# PLAN — Глобальная унификация авторизации и верификации в монорепо

> **Статус:** ✅ план утверждён, реализация идёт. **Сделано:** Этап 1 + код-часть Этапа 0 (сессия №1); Этап 2 эталон aboi (сессия №5) + тираж на dsperevod (сессия №6); реестр hub-клиентов → БД (сессия №7); **Этап 0.1 ✅ ПОЛНОСТЬЮ** (сессия №8); **Этап 1.5 ✅ ПОЛНОСТЬЮ** — фабрика + эталоны + README + E2E 3/3 (сессии №9–10).
> **Сессия №12 (2026-06-04, инфра — риски 0.2 + 0.3):** ✅ **Этап 0.2 основная защита** — fail2ban jail
> `maddy-submission` (Docker json-log regex, maxretry=5/bantime=24h, iptables port 587); пароли
> `kami@letar.best` и `admin@letar.best` сменены на 32-символьные. ✅ **Этап 0.3 частично** — скрипт
> `/opt/maddy/backup.sh` (tar maddy.conf + dkim_keys + credentials.db + aliases, cron 03:00, ротация 14д);
> rsync mail→s2→Resilio offsite-цепочка; Resilio R/O ключи убраны из публичного `backup-architecture.md`
> → `OPS_JOURNAL.local.md §14.4`. Коммиты `eff3f36`, `88f8773`.
> **Сессия №13 (2026-06-04, ремедиация + архитектурные решения):** зафиксированы 4 решения: Ключница в РФ
> (152-ФЗ локализация ✅ закрыт), Redis для rate-limit store (решение принято), `lena_*` БД не переименовывать,
> DKIM `направа.рф` не трогать (driving-school отправляет через `letar.best`). **Этап 2 п.3 ✅ ПОЛНОСТЬЮ** —
> ремедиация застрявших: aboi 0/2, dsperevod 0/3, auth-hub bulk-верификация 12→0 (OAuth VK-аккаунты апреля).
> **Этап 2 — ПОЛНОСТЬЮ закрыт.**
> **Сессия №14 (2026-06-04, Этап 0.3 — дочистить бэкапы):** ✅ Nginx NPM offsite подтверждён —
> бэкапы создавались на обоих серверах до мая; обнаружен баг `WORKSPACE_PATH=/home/deploy/lena`
> внутри контейнера (должен быть `/home/deploy/letar`) → nginx backup не создавался с 18 мая (s2)
> и 27 мая (s1, контейнер упал exit 127). Фикс: хардкод в `docker-compose.production.yml`;
> коммит `27960b3`, деплой запрошен у BlackCove. ✅ Ротация nginx бэкапов реализована
> (MAX_AUTO_BACKUPS=14); старые бэкапы почищены вручную (27 удалено на s2, 35 на s1). ✅ IgnoreList
> обновлён на s1 + s2: добавлены `.env.docker`/`.env.local`/`.env` → секреты не идут в Resilio.
> ✅ Dry-run восстановления: nginx архив (737 файлов, sqlite+certs) и Maddy архив (DKIM 8 доменов)
> валидны. ✅ Стратегия локальных credentials задокументирована в `backup-architecture.md`
> (KeePassXC для секретов, git для кода, Resilio для uploads+backups). Stub-файлы созданы на s1
> для s2-only apps. Деплой выполнен BlackCove (сессия №14 продолжение): s2 — nginx backup 8 KB ✅;
> s1 — remote lena→letar исправлен, контейнер поднят, nginx backup 7.9 MB ✅.
> **Этап 0.3 — ПОЛНОСТЬЮ закрыт.**
> **Сессия №15 (2026-06-04, Этап 4 — шаги 1–2):** разведка premium-rosstil (schema.zmodel, auth.ts,
> register-form, signin-form, auth-client). ✅ **Шаг 1:** `register-form.tsx` — заменить
> `fetch('/api/auth/register')` на `authClient.signUp.email({ name, email, password })`;
> удалён `/api/auth/register/route.ts`. ✅ **Шаг 2:** `signin-form.tsx` resend —
> `fetch('/api/auth/resend-verification')` → `authClient.sendVerificationEmail()`; удалён
> `/api/auth/resend-verification/route.ts`. Коммит в submodule `4d389d8` + bump SHA `20af8d5`.
> **Сессия №16 (2026-06-04, Этап 4 — шаги 3–6):** ✅ **Шаг 3:** `forgot-password-form.tsx` →
> `authClient.requestPasswordReset()` (в BA 1.6.11 метод `requestPasswordReset`, не `forgetPassword`);
> `reset-password-form.tsx` → `authClient.resetPassword()`;
> удалены кастомные API routes `/request-reset`, `/reset-password`. ✅ **Шаг 4:** удалены
> `lib/tokens.ts`, `lib/rate-limit.ts` и все потребители (`verify-email/route.ts`,
> `cleanup-rate-limits/route.ts`). ✅ **Шаг 5:** schema.zmodel — убрано поле `type` из `Verification`,
> дропнута `LoginAttempt`; migration `20260604155648_remove_custom_auth_fields` создана и применена.
> ✅ **Шаг 6:** `verify-email/page.tsx` переписан на `authClient.verifyEmail()` + resend UI при
> ошибке (ResendVerificationButton + поле email по эталону dsperevod). bump 0.73.4→0.74.0;
> коммит `51a465c` + bump SHA `230a07b`. **Этап 4 — ПОЛНОСТЬЮ завершён.**
> **Сессия №17 (2026-06-04, Этап 5 ✅ ПОЛНОСТЬЮ):** богатый pin-auth флоу в premium-rosstil:
> хук `sendVerificationEmail` генерирует PIN + отправляет письмо через `@letar/email` с кодом и ссылкой;
> `lib/pin-auth-adapters.ts` — `PinValidatorAdapter` (namespace через identifier, без поля type);
> SSE endpoint `/api/auth/verification-stream/[email]` — cross-tab синхронизация;
> server actions: `verify-pin`, `resend-verification-pin` (через BA API), `verify-login` (HMAC-signed cookie);
> страница `/auth/verify-pin` с Chakra `PinInput` + `usePinVerification` hook;
> register-form → редирект на verify-pin; signin EMAIL_NOT_VERIFIED → resend + редирект;
> rate limit `/send-verification-email {60,3}`; tsconfig paths + references для `@letar/pin-auth`.
> bump 0.74.0→0.75.0; коммит `7b0fcda` + bump SHA `7b67109`. **Этап 5 — ПОЛНОСТЬЮ завершён.**
> **Сессия №18 (2026-06-05, инфра + Этап 6 ✅):** ✅ **Redis** — `infra/redis/docker-compose.production.yml`
> (Redis 7-alpine, 256mb LRU, premium-network); `createRedisStorage(url)` в `@letar/auth/server`;
> auth-hub + kami → `secondaryStorage` + `rateLimit.storage='secondary-storage'`; задеплоено BlackCove.
> ✅ **§13.7** — `offline_access` scope добавлен в kami + фабрику (проактивно для refresh_token).
> ✅ **0.4** — решение принято: SOPS + age (self-hosted, KeePassXC, без нового сервиса).
> ✅ **0.7 canary** — `infra/canary/canary.ts` (SMTP→Maddy, IMAP→Яндекс kaspergreen@yandex.ru);
> cron каждые 15 мин через `docker compose run`; запрос деплоя у BlackCove.
> ✅ **Этап 6** — kami/auth.ts мигрирован на `createAuth({ mode: 'hub-client' })` (241→125 строк);
> фабрика расширена: `rateLimit`, `account`, `secondaryStorage` для hub-client; деплой запрошен.
> **Сессия №19 (2026-06-05, Этап 6 + 8.5 ✅):** OIDC flow kami отлажен (5 последовательных багов: docker-compose env,
> nextCookies() порядок, cookies() в Server Component, oidc-capture redirect, name_is_missing); кнопка Войти → сразу
> Ключница; `mapProfileToUser` fallback в фабрике hub-client. Миграция данных kami выполнена:
> 4 AudioFile + ADMIN → `kami@letar.best`; `letarkami@gmail.com` и `kaspergreen@gmail.com` удалены.
> **Сессия №20 (2026-06-05, Этап 8.5 скрипты):** Созданы скрипты миграции для dashboard/archetest/animatrona-tracker:
> `infra/migrations/dashboard-owner-migration.ts` (role ADMIN, нет контента), `archetest-owner-migration.ts`
> (QuizLeaderboard+Sessions+Achievements, roles[]), `animatrona-tracker-owner-migration.ts`
> (Anime/UserLibrary/Distribution/PinJob/Content). Подход: raw pg без ZenStack, dry-run режим.
> ⏳ **Запустить на s2** после логина в каждое приложение через Ключницу.
> **Сессия №21 (2026-06-05, Этап 6.5 ✅ ПОЛНОСТЬЮ):** Passkeys / WebAuthn в auth-hub:
> @simplewebauthn/server@13.3.1 + @simplewebauthn/browser@13.3.0; кастомный Better Auth плагин
> `passkeyPlugin()` (createAuthEndpoint + getSessionFromCtx + internalAdapter.createSession + setSessionCookie);
> таблица `passkey` в schema.zmodel + миграция `20260605154458_add_passkey`;
> baseline-миграция `20260101000000_init_baseline` (resolve --applied на prod перед деплоем);
> компоненты `PasskeySignInButton` + `PasskeyRegisterButton`; кнопка на странице /sign-in.
> rpID=letar.best (дефолт), origin=BETTER_AUTH_URL. typecheck ✅ lint ✅.
> ✅ **Деплой выполнен BlackCove** (5858b0c): baseline resolved + passkey таблица создана, auth-hub Ready.
> **Сессия №22 (2026-06-05, UX-анализ passkeys + logout):** обнаружены 2 UX-проблемы по скриншотам:
> (1) Passkey кнопка падает с ошибкой при 0 passkeys, нет Conditional UI, нет управления ключами → задокументирован
> детальный план Этап 6.5.1. (2) "Выход" в kami не выходит из Ключницы → тихий ре-логин → задокументирован
> Этап 6.51 (RP-initiated logout через end_session_endpoint).
> **Сессия №23 (2026-06-06, Этап 6.51 ✅ код):** RP-Initiated Logout реализован для всех hub-client приложений через
> `createLogoutAction(auth, { oidcLogout: { endSessionUrl, clientId, postLogoutRedirectUri } })`.
> Подход: `client_id` + `post_logout_redirect_uri` без `id_token_hint` (BA oidcProvider принимает; `id_token` не нужно хранить).
> Обновлены: `kami/auth.actions.ts` + `.env` (создан); `animatrona-tracker/auth.actions.ts` + `.env`.
> `BETTER_AUTH_OIDC_ISSUER=https://auth.letar.best` добавлен в `.env.docker` всех 6 через SCP.
> Задеплоено BlackCove: s1 kami ✅, s2 animatrona-tracker/dashboard/archetest/grandslamcup/time ✅.
> **Этап 6.51 — ПОЛНОСТЬЮ ЗАВЕРШЁН.**
> **Сессия №24 (2026-06-06, Этап 6.5.1 ✅ ПОЛНОСТЬЮ):** UX passkeys реализован: Шаг A — plugin.ts
> discoverable credential flow (`allowCredentials: []`) + try/catch + `DELETE /passkey/delete` endpoint;
> Шаг B — `usePasskeyConditionalAuth` хук (conditional UI autofill при загрузке страницы),
> `autoComplete="username webauthn"` на email-инпуте, `PasskeySignInButton` → только fallback
> (скрыта когда `browserSupportsWebAuthnAutofill()=true`); Шаг C — `PasskeyPromptBanner` в `/profile`
> (1 показ после входа, localStorage `passkey_prompt_dismissed`, dismissable); Шаг D — `/profile/passkeys`
> (список ключей + добавить + удалить, `PasskeysManager`); ссылка в навигации профиля.
> commit `812d518`, деплой запрошен у BlackCove.
> **Этап 6.5.1 — ПОЛНОСТЬЮ ЗАВЕРШЁН.**
> **Сессия №25 (2026-06-08, Этап 6.6 ✅ ПОЛНОСТЬЮ):** Telegram deep-link авторизация в auth-hub:
> кастомный `telegramPlugin()` (BA-плагин, 4 эндпоинта: start/webhook/status/unlink);
> таблица `telegramToken` + миграция `20260608192428_add_telegram_token`; `TelegramSignInButton`
> на /sign-in (условный рендер по env); email-заглушка `<id>@telegram.local`.
> commit `461abde`, деплой + webhook зарегистрированы BlackCove. **Этап 6.6 — ПОЛНОСТЬЮ ЗАВЕРШЁН.**
> **Сессия №26 (2026-06-10, план + env):** `.env.docker` auth-hub дополнен Telegram-кредами
> (`TELEGRAM_BOT_TOKEN`, `TELEGRAM_BOT_USERNAME=letar_best_bot`, `TELEGRAM_WEBHOOK_SECRET`);
> sync-env push + перезапуск + webhook-регистрация выполнены BlackCove. Добавлены в roadmap:
> **Этап 6.7** (гео-блокировка зарубежных OAuth для RU-IP, 149-ФЗ, GeoIP2 через NPM) и
> **Этап 0.8** (аудит соответствия 152-ФЗ — cookie-баннеры, согласия, РКН, тираж на все приложения).
> **Сессия №27 (2026-06-10, фикс passkeys):** ✅ Исправлена ошибка «Нет активной сессии» на странице
> `/profile/passkeys` — `getSessionFromCtx(ctx)` в Better Auth плагин-эндпоинтах возвращал `null`
> в Next.js App Router контексте. Три затронутых операции (register/options, register/verify, delete)
> перенесены в стандартные Next.js Route Handlers (`/api/passkey/register-options`,
> `/api/passkey/register-verify`, `/api/passkey/delete`) с правильным чтением сессии через
> `auth.api.getSession({ headers: await headers() })`. Также улучшены сообщения об ошибках.
> commit `69fb496`. typecheck ✅ lint ✅. Деплой запрошен BlackCove (msg #753).
> **Сессия №28 (2026-06-10, Этап 0.8 — уведомления РКН):** ✅ Зафиксированы поданные уведомления РКН:
> **letar** (`*.letar.best` + driving-school — то же ИП владельца) рег. № 100306050 от 02.06.2026;
> **aboi** (ИП Гаева) рег. № 100286690 от 16.05.2026. ✅ Решение: «трансграничная передача не осуществляется»
> корректно — 152-ФЗ касается граждан РФ, для RU-IP зарубежные провайдеры скроет гео-блокировка →
> **Этап 6.7 обязателен** для соответствия уведомлению. Не подано: premium-rosstil, imot, dsperevod
> (операторы — их владельцы). Коммиты `506f7cc`, `a43aae0`, `5db9241`.
> **Сессия №29 (2026-06-10, Этап 6.7 ✅ код):** Гео-блокировка иностранных OAuth для RU-IP.
> `auth-hub/src/lib/geo.ts` — `getCountryCode()` через `x-forwarded-for` + `geoip-lite` (MaxMind GeoLite2 локально).
> `sign-in/page.tsx` — фильтрует google/github/facebook/telegram для RU-IP; VK/Yandex/passkeys остаются.
> `oauth-buttons.tsx` — принимает проп `providers`. Fallback: нет заголовка → показывать всё (dev).
> Также: fix TS2322 в passkey-prompt-banner + passkeys-manager (`PublicKeyCredentialCreationOptionsJSON`).
> typecheck ✅ lint ✅. commit `b80de69`. Деплой запрошен BlackCove (msg #754).
> **Сессия №30 (2026-06-10, Этап 0.8 — cookie-баннер + DRY):** ✅ Общие компоненты `@letar/ui@0.3.0`:
> `CookieBanner`, `CookieSettingsButton`, `DeleteAccountZone`, `CookieConsentState`, `createConsentConfig`, `readConsentState`.
> `auth-hub`: ConsentLog в БД, POST `/api/consent`, `deleteAccountAction`, CookieBanner в layout. `aboi`: рефакторинг на shared компоненты.
> `dsperevod`: рефакторинг на shared компоненты (cookie-banner, yandex-metrika-consent, lib/consent).
> Коммиты `045bc31` (ui), `6088286` (auth-hub), `67212ae` (aboi), `791b665` (dsperevod), `1081c70` (submodule bump).
> **Сессия №31 (2026-06-10, Этап 0.8 ✅ ПОЛНОСТЬЮ):** ✅ Тираж 152-ФЗ на 4 оставшихся приложения.
> **premium-rosstil**: ConsentLog + миграция, `/api/consent`, YandexMetrikaConsent (consent-aware обёртка),
> CookieBanner в layout, deleteAccountAction → DeleteAccountZone в settings/page.tsx.
> **imot**: ConsentLog + миграция (reset drift: scope/Verification), `/api/consent`, deleteAccountAction,
> DeleteAccountZone в my-profile/page.tsx, CookieBanner в layout.
> **driving-school**: ConsentLog + миграция (reset drift: StudyGroup/TheoryTopic), `/api/consent`,
> deleteAccountAction (soft-delete через deletedAt), DeleteAccountSection в settings/page.tsx, CookieBanner.
> **grandslamcup**: ConsentLog + миграция, `/api/consent`, deleteAccountAction, DeleteAccountSection
> в profile/page.tsx, CookieBanner в layout. Все субмодули запушены, SHA обновлены в letar.
> **Сессия №32 (2026-06-11, Этап 7 ✅ ПОЛНОСТЬЮ):** `driving-school/auth.ts` мигрирован на `createAuth({ mode: 'standalone' })` (~607→~330 строк); `@letar/auth` расширен полями `socialProviders`, `databaseHooks`, `password` (v0.5.0→v0.6.0); pin-auth адаптеры обновлены на namespace-подход без поля `type` (как в premium-rosstil Этап 5); SSE endpoint обновлён (`autologin:email` namespace); добавлен `magicLink` плагин BA + UI на /sign-in (`MagicLinkForm` + server action). `magicLinkClient()` добавлен в `auth-client.ts`.
> **Сессия №33 (2026-06-11, Этап 8 ✅ ПОЛНОСТЬЮ):** `auth-hub/auth.ts` мигрирован на `createAuth({ mode: 'hub-provider' })` (~401→~205 строк без хелперов); `@letar/auth` расширен: `buildHubProviderAuth` (oidcProvider авто-включён, rate-limit с OIDC-правилами, secondaryStorage, account-linking), `OidcProviderConfig` в types; 8 новых тестов hub-provider (nextCookies последний, oidcProvider с defaults и кастомом, rate-limit, accountLinking); `@letar/auth` v0.6.0→v0.7.0; `auth-hub` v0.4.0→v0.5.0.
> **➡️ Следующий старт:** **v0.4.0 auth-hub** — OIDC Pending Auth Cookie (возврат на исходный сайт после social OAuth при смене аккаунта).
> **Этап 0.5 ✅ ПОЛНОСТЬЮ** (owner:letar теги + ESLint-граница + owner:commercial теги 10 submodules + реципрокный constraint — см. сессию №3 ниже).
> **Режим:** реализация поэтапная (§7); все точки решения закрыты или отложены с обоснованием (§9).
> **Дата ревизии:** 2026-05-30 (архитектурная проработка с UI/UX-архитектором, все §13 вопросы закрыты).
> **Операционная сессия 2026-05-30:** разовая склейка email владельца в Ключнице **ВЫПОЛНЕНА** (§14.1);
> добавлен Telegram-вход (Этап 6.6); выявлены инфра-задачи — брутфорс Maddy, форвард, MCP kami (§14).
> **Финализация:** добавлен периодический canary-мониторинг доставки email (Этап 0.7) — план полный.
> **Ревизия №2 (2026-05-30, инцидент-реагирование):** инфра-задачи §14.2 подняты в roadmap (Этап 0.1 ротация
> утёкших OIDC-секретов 🔴, Этап 0.2 защита почты + DKIM/SPF/DMARC); добавлены критический путь и фазы (§6),
> DoD по этапам, ремедиация застрявших юзеров (Этап 2), заметки про rate-limit store / SSE-масштабирование (§8).
> **Сессия реализации №1 (2026-05-30, только код в публичном дереве):** ✅ Этап 1 (security-hardening
> `@letar/pin-auth` + `@letar/auth`) и ✅ код-часть Этапа 0 (централизованный лог `@letar/email` + фикс
> игнорируемого результата в mandala). Этап 0.5 (Nx owner-теги) и инфра-часть (0.1/0.2/DKIM/canary) — следующие сессии.
> **Сессия реализации №2 (2026-05-30, публичное дерево):** ✅ **Этап 0.1 код-часть** — 6 OIDC `clientSecret`
> вынесены из `auth-hub/src/lib/auth.ts` в `process.env.OIDC_*_SECRET` (fail-fast хелпер); значения добавлены в
> `.env.local`/`.env.docker` (не коммитятся). ✅ **Этап 0.5 публичная часть** — тег `owner:letar` в 60 project.json
>
> - depConstraint `owner:letar → [scope:shared, owner:letar]` в `eslint.config.mjs` (0 нарушений границ).
>   **Сессия реализации №3 (2026-05-30, submodules + публичное дерево):** ✅ **Этап 0.5 завершён** — тег
>   `owner:commercial` в 10 submodule-проектов (коммиты внутри submodules + bump SHA в letar); реципрокный
>   depConstraint `owner:commercial → [scope:shared, owner:commercial]` в `eslint.config.mjs`; module-boundary чист.
>   ✅ Этап 0.1 инфра закрыт (сессия №8). Осталось по Фазе A: 0.2/DKIM/0.7 (инфра).
>   **Сессия реализации №4 (2026-05-30, submodules — гигиена lint):** ✅ устранены предсуществующие падения
>   `nx lint` в 3 коммерческих submodules (обнаружены при Этапе 0.5, к тегам отношения не имеют — код в `src/`):
>   **aboi** — curly-автофикс + осиротевшие `eslint-disable` для незарегистрированных правил заменены
>   (`no-img-element` → `oxlint-disable`, `exhaustive-deps`/`no-danger` удалены); **driving-school** — исправлен
>   нерабочий идентификатор `oxlint-disable` для `no-img-element` (data-URL превью + внешние логотипы); **dsperevod** —
>   `rules-of-hooks` (`useMDXComponents` вынесен в константу `baseMdxComponents`) + curly-автофикс (был скрыт за
>   падением oxlint). Коммит внутри каждого submodule + bump SHA в letar. `nx run-many -t lint -p aboi
>   driving-school dsperevod` зелёный. ⏳ Заведена отдельная задача на предсуществующий `typecheck:tsgo` TS2883 в
>   `dsperevod/src/lib/auth-client.ts` (непортируемый тип better-auth — вне scope lint-сессии).
>   **Сессия реализации №5 (2026-05-31, submodules aboi + aboi-e2e):** ✅ **Этап 2 — эталон aboi** (resend
>   email-верификации): блок resend на `/sign-in` (EMAIL_NOT_VERIFIED) и форма на `/verify-email`; захват
>   `SendEmailResult` + rate-limit `/send-verification-email {60,3}` (`lib/auth.ts`); Umami-события §13.9
>   (`lib/analytics.ts`); E2E `email-verification.spec.ts` зелёный (chromium, полный флоу включая верификацию по
>   токену). bump aboi 0.23.2→0.24.0; коммиты в submodules aboi + aboi-e2e + bump 2 SHA. Follow-up: email-уровень
>   rate-limit ip+email; порядок `nextCookies()` (warning Better Auth — должен быть последним).
>   **Сессия реализации №6 (2026-06-02, dsperevod submodule + letar публичное):** ✅ **Этап 2 — тираж resend на dsperevod**
>   (по эталону aboi): миграция email на `@letar/email` (`sendVerificationEmail`/`sendPasswordResetEmail` + `reportEmailFailure`);
>   `rateLimit /send-verification-email {60,3}` + `autoSignInAfterVerification: true`; `lib/analytics.ts` (KPI §13.9);
>   `sign-in` перехват `EMAIL_NOT_VERIFIED` + `<ResendVerificationButton>`; `verify-email` resend-форма при ошибке токена;
>   `next.config.mjs` `skipTrailingSlashRedirect: true` (fix: better-auth API в dev с trailingSlash: true);
>   E2E `email-verification.spec.ts` зелёный (chromium, 3/3 passed). bump dsperevod 0.4.0→0.5.0.
>   ✅ Создана команда `/repo` (`.claude/commands/repo.md`) — статус глобального плана из PLAN.md.
>   Follow-up: `SMTP_FROM_EMAIL` для dsperevod (сейчас `SMTP_FROM`, инфра-задача); email-уровень rate-limit ip+email.
>   **Ревизия №3 (2026-06-03, абстракция авторизации — основная цель, проработка плана без реализации):**
>   зафиксирована **единая ось из 3 режимов** (`standalone` / `hub-client` / `hub-provider`) и слияние «профиля» (§2.2)
>   с «Tier» (§2.3) — переписаны §2.2/§2.3/§4. Решения сессии: (1) «переход коммерса на letar.best» = **OIDC-клиент
>   Ключницы** (не CNAME, не шаринг ключей); (2) форма абстракции = **серверная фабрика `createAuth(profile)`** в
>   `@letar/auth/server`; (3) выделен **новый Этап 1.5** (абстракция) в Фазе B перед тиражом; (4) **Tier 2 = только
>   standalone** (свои ключи из БД при старте, без runtime-динамики → D8 не блокирует основную цель). Найдены и внесены
>   недочёты: «переход режима = миграция identity» (§10, связь с §8.5), hub-client отдаёт домен письма Ключнице (§2.4),
>   регистрация hub-клиента = операционная процедура (`trustedClients` хардкод). Это **проработка**, код не тронут.
>   **Сессия реализации №7 (2026-06-03, auth-hub публичное дерево):** ✅ **реестр hub-клиентов → БД** (под-вопрос Этапа 1.5 п.4):
>   `trustedClients` (7 клиентов) и `requireOidcSecret()` удалены из `auth.ts`; добавлен `prisma/seed.ts` — upsert 7 клиентов
>   из `OIDC_*_SECRET` env vars через raw ZenStack ORM (обходит `@@deny('all', true)`); nx target `db:seed`; обновлена
>   `/admin/clients` (redirect URLs, toggle disabled, пустой стейт с инструкцией); `docker-compose.dev.yml` для локальной БД;
>   seed выполнен и проверен (7/7 ✓). Особенность BA v1.6.11: `skipConsent` не читается из БД → studio покажет consent 1 раз.
>   ✅ Деплой на s2 выполнен: seed 7/7 + перезапуск auth-hub (BlackCove).
>   **Сессия реализации №8 (2026-06-04, инфра — Этап 0.1 ✅ ПОЛНОСТЬЮ):** ротация 6 утёкших OIDC-секретов:
>   сгенерированы новые значения; обновлены `.env.docker` auth-hub + 6 клиентов (kami, dashboard, archetest, time,
>   grandslamcup, animatrona-tracker) локально и на s2; добавлен `OIDC_STUDIO_SECRET` (studio-prod, новый клиент);
>   повторный seed на s2 — upsert 7/7; рестарт всех контейнеров в порядке (auth-hub → клиенты). Старые литералы
>   из публичной git-истории отозваны. Риск 🔴 «секреты в публичном репо» закрыт.
>   **Сессия реализации №9 (2026-06-04, Этап 1.5 ⏳):** фабрика `createAuth(profile)` в `@letar/auth/server`:
>   типы `AuthProfile` (3 режима), generic build-функции, 16 Vitest тестов; bump 0.3.0→0.4.0. Эталоны:
>   dsperevod (standalone, 90→35 строк) + time (hub-client, 84→20 строк, без DB). Ограничение Better Auth:
>   `additionalFields` не выводятся через фабрику — 3 cast-сайта dsperevod исправлены через `as unknown as`.
>   Осталось по DoD: README + E2E behavior-parity.
>   **Сессия реализации №11 (2026-06-04, Этап 3 ✅ ПОЛНОСТЬЮ):** admin/users с VerifyButton во всех 5 приложениях:
>   aboi (новая страница + AdminNav), kami (новая страница + AdminSidebar), auth-hub (VerifyButton в существующую),
>   dsperevod (verifyUserAction + logAudit + VerifyButton), premium-rosstil (verifyUserAction + VerifyButton + колонка).
>   Коммиты в 3 submodule + bump SHA + корневой репо.
>   **Сессия реализации №10 (2026-06-04, Этап 1.5 ✅ DoD):** README `@letar/auth` полностью переписан —
>   добавлен раздел `createAuth()` с контрактом `AuthProfile`, всеми тремя режимами, примерами dsperevod/time,
>   ограничением `additionalFields`; обновлена дата и версия (0.4.0). Создан `docker-compose.dev.yml` для dsperevod
>   (postgres:17, порт 5442). E2E behavior-parity: 3/3 passed chromium — поведение standalone через фабрику
>   идентично эталону сессии №6. **Этап 1.5 закрыт полностью.**

## Как читать документ

1. §1 Видение. 2. §2 Модель владения + **3 режима `createAuth()`** ⭐ (ось абстракции). 3. §3 Состояние (факты).
2. §4 Целевая архитектура + **контракт `createAuth(profile)`** ⭐. 5. §5 Карта auth. 6. §6 Критический путь и DoD. 7. §7 Этапы (**1.5 — абстракция** ⭐).
3. §8 Сквозные требования. 9. §9 Точки решения (D10 — абстракция). 10. §10 Риски. 11. §11 Документация. 12. §12 Агенты.

---

## 1. Видение и цель

Единая переиспользуемая система авторизации и email-верификации для всего монорепо, на библиотеках,
с сохранением лучших наработок (эталон — `driving-school`) и без дублирования:

- **`@letar/auth`** — сессии, клиент (Better Auth), OAuth-кнопки, guards **+ серверная фабрика `createAuth(profile)`**
  ⭐ (новое, Этап 1.5): единая точка, инкапсулирующая выбор **режима** (`standalone` / `hub-client` / `hub-provider`)
  и **источника соц-секретов** (env / БД-админка / Ключница). Конфигом, не хардкодом; убирает дублирование `auth.ts`.
- **`@letar/pin-auth`** — верификация email: **коды + ссылки в одном письме**, **синхронизация вкладок**
  (SSE), **resend с cooldown**, авто-логин. Уже существует и зрелая.
- **`@letar/email`** — отправка через Maddy; `SendEmailResult` для логирования SMTP-ошибок.
- **Ключница (`auth-hub`)** — централизованный **OIDC-провайдер** для пет-проектов одного владельца.

**Ключевой принцип — мульти-владельческая природа.** В монорепо вперемешку **коммерческие проекты разных
владельцев** и **личные пет-проекты**. Поэтому единой схемы auth быть не может: авторизация, секреты и
email-домен — **по владельцу проекта**; Ключница — дефолт только для петов, для коммерции **не обязательна**.

**Ключевой принцип — абстракция через режим, а не через копирование.** Различие приложений сводится к **одному
объекту `AuthProfile`** (владелец, режим, источник секретов, домен письма), который передаётся в `createAuth()`.
Приложение не собирает `betterAuth({...})` руками (сейчас `auth-hub/lib/auth.ts` — ~390 строк, копируемых при тираже)
— оно **декларирует профиль**. Смена режима (коммерс «переходит на letar.best») = смена профиля, а не переписывание `auth.ts`.

> **Первопричина инцидента:** неверный `SMTP_FROM_EMAIL` (письма молча не доходили) + тупик
> неверифицированного пользователя на `/sign-in` без resend. Resend лечит симптом, доставку чинит Этап 0.

---

## 2. Модель владения, auth-профили и соц-секреты ⭐

### 2.1 Классификация проектов

Признак коммерческого проекта: **приватный submodule** (`kamiletar/letar-private-*`) + **свой домен в `.env.docker`**.

- **Коммерческие (разные владельцы):** `premium-rosstil` (premium.rosstil.ru), `driving-school` (направа.рф),
  `aboi` (neyroaboi.ru), `dsperevod`, `imot` — все приватные submodules. Git-изоляция уже есть.
- **Личные петы (владелец — letar):** `kami`, `dashboard`, `auth-hub` (Ключница), `mandala`, `archetest`,
  `time`, `grandslamcup`, `animatrona-*` и пр. — публичное дерево `letar`, домены `*.letar.best`.

### 2.2 Три режима авторизации (`AuthProfile.mode`) ⭐ РЕШЕНО (ревизия №3)

Единая ось абстракции. Каждое приложение выбирает **ровно один** режим, передавая его в `createAuth(profile)`.
«Профиль владельца» и «Tier секретов» (§2.3) сведены в эту ось — отдельных классификаций больше нет.

| Режим              | Кому                                                        | Соц-вход                       | Email/pass  | Секреты                       | Identity (user.id) |
| ------------------ | ----------------------------------------------------------- | ------------------------------ | ----------- | ----------------------------- | ------------------ |
| **`standalone`**   | коммерсы (дефолт); кому нужен свой бренд/контроль           | свои OAuth-приложения (Tier 2) | локально    | владельца: env или БД проекта | своя БД приложения |
| **`hub-client`**   | петы `*.letar.best`; коммерс, осознанно перешедший (Tier 1) | через Ключницу (OIDC-редирект) | на Ключнице | общие letar                   | **Ключницы**       |
| **`hub-provider`** | только `auth-hub`                                           | сам выдаёт (для всех клиентов) | сам         | общие letar                   | мастер-источник    |

- **`standalone`** — приложение само себе Better Auth. Свой домен, своя БД пользователей. Соц-вход опционален:
  без него — только email/password (дефолт); с ним — владелец вводит **свои** ключи (Tier 2, §2.3).
- **`hub-client`** — приложение делегирует вход Ключнице (как сейчас kami/dashboard/archetest/time/grandslamcup/
  animatrona-tracker). `createAuth()` подключает `genericOAuth` на OIDC-discovery Ключницы; локальные соц-провайдеры
  не нужны. **Это и есть «переход коммерса на авторизацию letar.best»** (решение ревизии №3).
- **`hub-provider`** — единственный экземпляр: `auth-hub`. `createAuth()` подключает `oidcProvider`-плагин.

> ⚠️ **Смена режима — не бесплатна.** `standalone → hub-client` меняет источник identity (user.id Ключницы вместо
> локальных) → требует **миграции/перепривязки данных** существующих пользователей (тот же класс задачи, что перенос
> данных в петах §14.1 и merge §8.5). Закладывать как миграцию, а не как флаг. См. риск в §10.

> **Multi-tenant Ключница (CNAME + изоляция тенантов)** — отдельная далёкая опция для гипотетической «SaaS Ключницы»,
> **не** входит в основную цель и НЕ является способом «перехода коммерса» (его покрывает `hub-client`). См. D8 §9.

### 2.3 Соц-секреты: два Tier = выбор режима (§2.2) — РЕШЕНО (уточнено в ревизии №3)

Tier — это **не отдельная ось**, а проекция выбора режима §2.2. В админке коммерческого проекта владелец делает
**один informed-consent выбор**, который и определяет режим:

|                         | **Tier 1 — «наши ключи»** = `hub-client`     | **Tier 2 — «свои ключи»** = `standalone` + BYO  |
| ----------------------- | -------------------------------------------- | ----------------------------------------------- |
| Что происходит          | проект становится OIDC-клиентом Ключницы     | проект остаётся standalone, вводит свои ключи   |
| Соцтокены               | общие letar, через Ключницу                  | владелец вводит свои OAuth-приложения в админке |
| Морока настройки        | letar, **разово на всех**                    | **владелец** (letar лишь хранит secret)         |
| Брендинг consent-экрана | letar / Ключница                             | владельца                                       |
| Домен письма верифик.   | **letar.best** (Ключница) — теряет свой      | **домен клиента** (контроль у владельца)        |
| Владение, риск бана     | letar (общий риск)                           | владельца                                       |
| Identity / данные       | user.id Ключницы → **миграция при переходе** | свои user.id, миграции нет                      |
| Когда                   | старт, MVP                                   | дорос, хочет владеть/брендировать               |

- **Требование:** UI в админке — «ввести свои ключи» ИЛИ «перейти на авторизацию letar.best» с **явным показом
  рисков** (бренд, домен письма, риск бана, миграция identity, letar = обработчик ПДн §2.6).
- **Честное ограничение:** брендинг consent-экрана Google в Tier 1 не обходится (показывает владельца
  OAuth-приложения); кастомный домен Ключницы (CNAME) брендирует только URL. Бренд клиента → только Tier 2.
- **Хранение Tier 2:** secret шифруется at-rest в БД **его** проекта (не в общей); читается `createAuth()` при
  старте/reload приложения.
- **✅ D8 не блокирует основную цель (решение ревизии №3):** Tier 2 живёт **только на standalone-инстансе** →
  провайдеры собираются из БД при старте/reload, **без runtime-динамики в Ключнице**. Динамическая регистрация
  провайдеров/клиентов (D8) нужна лишь для гипотетической multi-tenant «SaaS Ключницы» — вынесена из scope (§9-D8).

### 2.4 Email/password — локальный, но инфраструктура per-владелец

Не требует внешних секретов → почти всегда локальный. Но тянет за собой:

- **Домен писем** — верификация/сброс уходят с **домена клиента** (`SMTP_FROM` на его домене), иначе спам-флаги
  (прямая связка с первопричиной `SMTP_FROM_EMAIL`).
- **Изоляция пользователей** — БД/таблица юзеров клиента отдельно.
- **Ссылки/PIN** — ведут на домен клиента.
- **⚠️ Режим `hub-client` ломает это для коммерса:** при переходе на Ключницу email-верификация и письма уходят с
  `letar.best`, а не с домена клиента → потеря брендинга письма + риск спам-флагов на чужом домене. Явный trade-off
  Tier 1, показывать в consent (§2.3). У `standalone` (Tier 2) контроль над доменом письма остаётся у владельца.

### 2.5 Структура монорепо

Изоляция уже обеспечена submodules. Для логического разделения — **Nx tags** (`owner:letar` / `owner:commercial`)

- module-boundaries (ESLint запретит кросс-импорты твоё↔клиентское). Физические папки (`apps/letar/…`) — дорого
  (ломает paths/CI/docker/`deploy-affected.sh`/submodules) и без выгоды сверх тегов; только при потребности в
  отдельных деплой-пайплайнах → `@nx/workspace:move`.

### 2.6 Правовая сторона (152-ФЗ, владение, согласия)

> Детали и шаблоны — `.claude/docs/personal-data.md` (152-ФЗ, РКН, cookie-согласия, чекбоксы ПДн).

- **Оператор vs обработчик ПДн.** `standalone`-коммерс (Tier 2) = **оператор** ПДн своих пользователей. Как только
  проект переходит в `hub-client` (Tier 1) — вход и данные сессии идут через Ключницу, letar становится
  **обработчиком** → нужен **договор поручения обработки** (ст. 6 152-ФЗ) между letar и владельцем проекта.
  Это юридическое следствие «переход коммерса на letar.best» — показывать в consent (§2.3) и оферте.
- **Согласия и политики per-домен.** Чекбоксы согласия на обработку ПДн при регистрации; Политика
  конфиденциальности и cookie-согласие (РКН) — на домене **каждого** проекта, от имени его оператора.
- **Локализация (ст. 18 152-ФЗ) ⛔ блокер, проверить РАНО.** ПДн граждан РФ — на серверах в РФ. Где хостятся
  Ключница и БД? Если вне РФ — влияет на архитектуру (перенос инфраструктуры) → решить ДО Этапов 6–8, а не в конце.
- **Tier 1 — владение OAuth.** Закрепить в оферте/ToS, что соц-вход обслуживается инфраструктурой letar
  (§2.3) — клиент принимает осознанно.
- **Account-merge (склейка email).** Объединение ПДн из разных аккаунтов — фиксировать основание и аудит;
  сохранять право на удаление/выгрузку. См. Этап 8.5.
- **Разные владельцы → разные операторы** → изоляция данных и раздельная ответственность обязательны.

---

## 3. Текущее состояние (проверено по коду)

### 3.1 Матрица приложений

| App                 | Владелец      | Auth-механизм                        | Верификация email                                   | Роли                | `admin/users`             | DB в admin          |
| ------------------- | ------------- | ------------------------------------ | --------------------------------------------------- | ------------------- | ------------------------- | ------------------- |
| **aboi**            | commercial    | Better Auth + `anonymous`            | link, `sendOnSignUp` (тупик `EMAIL_NOT_VERIFIED`)   | `roles: string[]`   | ❌ создать                | `prismaAuth`        |
| **kami**            | letar pet     | Better Auth + OIDC-клиент Ключницы   | link (`requireEmailVerification: true`)             | `roles: UserRole[]` | ❌ создать                | `prisma` (+обогащ.) |
| **dsperevod**       | commercial    | Better Auth standalone               | link (`requireEmailVerification: true`)             | `role` (single)     | ✅ есть (+статус+actions) | `getEnhancedPrisma` |
| **auth-hub**        | letar (инфра) | **Ключница — OIDC provider**         | link, **только в production**                       | `roles: UserRole[]` | ✅ есть (+статус)         | `prisma` (plain)    |
| **premium-rosstil** | commercial    | Better Auth standalone               | **кастомная**; `requireEmailVerification` не задан  | `role` (single)     | ✅ есть (без статуса)     | `getEnhancedPrisma` |
| **driving-school**  | commercial    | Better Auth + `organization` (teams) | **`@letar/pin-auth`: коды + ссылки + cross-tab** ⭐ | `roles: UserRole[]` | (своя)                    | `prismaAuth`        |
| **imot**            | commercial    | Better Auth standalone               | (вне активной auth-задачи)                          | —                   | —                         | —                   |
| **mandala**         | letar pet     | PIN                                  | PIN (`resend-pin.action`)                           | —                   | (своя)                    | —                   |

**OIDC-клиенты Ключницы** (`trustedClients`): kami, dashboard, archetest, time, grandslamcup, animatrona-tracker.

### 3.2 Состояние библиотек

- **`@letar/pin-auth`** — уже реализует всё ценное: `server` (`generatePin/generateToken`, `createPinValidator`
  с `maxAttempts`, `createTokenManager` с cooldown), `client` (`usePinVerification`, `useResendCountdown`,
  `useVerificationStream` — SSE cross-tab), `email` (`formatVerificationEmail` — PIN + ссылка), `schemas`.
  **БД-агностична** (адаптеры-callbacks); эталон-потребитель — `driving-school`.
  ⚠️ Спроектирована под `emailVerified: DateTime` + модель `verificationToken`; Better Auth — `Boolean` +
  таблица `verification`. Адаптеры разруливают, но это работа Этапа 1.
- **`@letar/auth/client`** — фабрики клиента, `OnlyFor`, `SessionProvider`, OAuth-кнопки, connected-accounts,
  ✅ `ResendVerificationButton` (добавлен в Этапе 1).
- **`@letar/auth/server`** — есть session-helpers, guards, checks, logout/unlink-actions. **🔴 Серверной фабрики
  `createAuth()` НЕТ** → каждое приложение собирает `betterAuth({...})` руками (auth-hub ~390 строк, копируются при
  тираже). Это корневой пробел абстракции — обоснование **Этапа 1.5**.
- **`@letar/email`** — `sendVerificationEmail()` → `SendEmailResult`; результат теперь захватывается (Этап 0/2).

### 3.3 Болевые точки

- aboi `/sign-in` `EMAIL_NOT_VERIFIED` — только текст, нет resend.
- premium-rosstil — параллельная кастомная верификация (дублирует Better Auth, ничего не гейтит).
- ✅ auth-hub — OIDC client secrets **ротированы** (сессия №8): литералы убраны из кода (сессия №2), новые значения
  сгенерированы и загружены в БД через seed. Старые значения из git-истории отозваны.
- Три модели ролей, три способа DB-доступа в admin, auth-hub без i18n.

---

## 4. Целевая архитектура

| Слой                 | Зона ответственности                                                                                          |
| -------------------- | ------------------------------------------------------------------------------------------------------------- |
| `@letar/auth` сервер | ⭐ `createAuth(profile)` — фабрика `betterAuth`-инстанса по режиму (§2.2); + session-helpers, guards, checks. |
| `@letar/auth` клиент | `authClient`, OAuth-кнопки, `ResendVerificationButton`, `OnlyFor`, `SessionProvider`, connected-accounts.     |
| `@letar/pin-auth`    | Верификация: коды+ссылки, cross-tab (SSE), resend+cooldown, авто-логин, шаблоны.                              |
| `@letar/email`       | Транспорт (Maddy), `SendEmailResult`, **централизованный лог** SMTP-ошибок.                                   |
| Ключница (auth-hub)  | Единственный `hub-provider`; (Этап 8) управление соц-секретами; реестр hub-клиентов (`trustedClients`).       |
| Приложение           | **Декларирует `AuthProfile`** + тонкая интеграция: страницы, server actions, адаптеры БД, i18n, rate-limit.   |

**Контракт `createAuth(profile)` (проектируется в Этапе 1.5, здесь — целевой эскиз, не финальный API):**

```ts
interface AuthProfile {
  mode: 'standalone' | 'hub-client' | 'hub-provider' // ось §2.2
  database: BetterAuthAdapter // prismaAdapter / enhanced — параметр приложения
  baseURL: string
  emailVerification?: PinAuthConfig | BasicVerifyConfig // pin-auth (богатый) или базовый Better Auth
  social?: // только standalone:
    | { source: 'env' } //   Tier 2 ключи из process.env (дефолт)
    | { source: 'db'; load: () => Promise<SocialKeys> } //   Tier 2 ключи из БД проекта (чит. при старте/reload)
  hub?: { issuerURL: string; clientId: string } // только hub-client: OIDC-discovery Ключницы
  roleField?: 'role' | 'roles' // примиряет 3 модели ролей (§3.3)
}
```

- `standalone` → собирает `socialProviders` из `social.source`; `hub-client` → `genericOAuth` на `hub.issuerURL`,
  локальных провайдеров нет; `hub-provider` → подключает `oidcProvider`-плагин (только auth-hub).
- Resend-кнопка — тонкая обёртка, **принимает `authClient` параметром** (aboi/kami строят клиент из `better-auth/react`).
- ⚠️ Контракт **не финализирован** — точная сигнатура, типы ролей и подключение pin-auth уточняются в Этапе 1.5 (spike).

---

## 5. Карта auth монорепо

- **Богатый флоу (эталон):** driving-school (pin-auth). **Тупик без resend:** aboi, kami, dsperevod, auth-hub.
- **Кастомная верификация:** premium-rosstil (мигрируем — §9-D4). **PIN:** driving-school, mandala.
- **OIDC-клиенты Ключницы:** kami (гибрид), dashboard (только Ключница), archetest/time/grandslamcup/animatrona-tracker.

---

## 6. Критический путь, фазы и DoD

**Фазы:**

- **Фаза A — Инцидент-реагирование и инфра (0.x):** доставка писем, ротация утёкших секретов, защита почты,
  **ревизия бэкапов (0.3)**, **secret-manager (0.4)**, теги, **завершение ренейма lena→letar (0.6)**, canary.
  Делается первой; этапы 0.x параллелятся между собой.
- **Фаза B — Фундамент, абстракция и тираж (1–5):** библиотеки → resend → **абстракция `createAuth()` (1.5)** →
  admin → premium-миграция → богатый pin-auth флоу. ⭐ Этап 1.5 — основная цель ревизии №3, ставится перед тиражом.
- **Фаза C — Продвинутое (6–8.5):** kami (первый `hub-client` на фабрике), passkeys, Telegram, driving-school на
  библиотеку, соц-секреты, merge.

**Критический путь (что блокирует что):**

| Этап                  | Зависит от            | Можно параллельно с |
| --------------------- | --------------------- | ------------------- |
| 0, 0.1, 0.2, 0.5      | —                     | друг с другом       |
| 0.3 бэкапы            | —                     | 0.2 (Maddy), 0.4    |
| 0.4 secret-mgr        | — (research)          | 0.1, 0.3            |
| 0.6 ренейм-хвост      | —                     | 0.3 (пути бэкапов)  |
| 0.7 canary            | 0                     | 0.1, 0.2            |
| 1 libs                | — (публичные `libs/`) | 0.x                 |
| **1.5 createAuth ⭐** | **1**                 | **0.x, 2, 3**       |
| 2 resend              | 1                     | 3, 1.5              |
| 3 admin               | частично 1            | 2, 1.5              |
| 4 premium             | 1, 2, **1.5**         | 3, 5                |
| 5 pin-флоу            | 1                     | 3, 4                |
| 6 kami (`hub-client`) | 1, **1.5**            | —                   |
| 6.5 passkeys          | 6                     | 6.6                 |
| 6.6 telegram          | auth-hub              | 6.5                 |
| 7 driving-school      | 1, 5, **1.5**         | 6.x                 |
| 8 секреты             | **1.5**, 1–7          | —                   |
| 8.5 merge             | auth-hub              | 8                   |

> **1.5 не блокирует уже идущий тираж жёстко:** resend (2) и admin (3) могут идти параллельно. Но **новые потребители
> режимов** (4 premium, 6 kami как `hub-client`, 7 driving-school, 8 секреты) встают **на фабрику** → завязаны на 1.5.
> Поэтому 1.5 — раньше них. Эталон самой фабрики обкатывается на 1 standalone (dsperevod) + 1 hub-client (kami) — см. §7.

**Definition of Done — глобальный минимум на каждый этап:** (1) код + тесты (Vitest/Playwright, TDD) зелёные;
(2) `nx format && nx lint && nx typecheck:tsgo` чисто; (3) затронутая документация (§11) обновлена; (4) bump версии
и CHANGELOG; (5) для коммерсов — коммит в submodule + bump SHA. Доп. критерии приёмки — в этапах ниже («✓ DoD»).

---

## 7. Этапы (roadmap)

> Каждый этап автономен и тестируется отдельно. Коммерческие — приватные submodules (коммит внутри + bump SHA).

### Этап 0 — Доставка писем (первопричина) ⏱ первым

- Аудит `SMTP_FROM_EMAIL`/SMTP на всех (`/sync-env`, `email-maddy`); для коммерсов — домен письма = домен клиента (§2.4).
- **DKIM/SPF/DMARC per-домен (явный deliverable).** Техн. первопричина «форвард режется gmail» (§14.2): валидные
  DNS-записи для каждого отправляющего домена (`letar.best`, `premium.rosstil.ru`, …). Без них письма в спам/режутся
  даже при верном `SMTP_FROM`.
- **Baseline-метрики (снять ДО правок).** Зафиксировать старт: % доставки, % верификации, число застрявших
  аккаунтов (`emailVerified` пусто/false). Иначе успех Этапа 0/2 недоказуем.
- ✅ **Централизованный лог `success === false` в `@letar/email`** (сессия №1): `reportEmailFailure({ type, to, error })`
  → `[email] send failed {...}` (виден в `docker logs`); `setEmailFailureAlerter` — env-gated точка расширения
  для Telegram/Umami (интеграции — инфра-сессия); bump 0.1.0→0.2.0 + CHANGELOG. ✅ Фикс игнорируемого результата
  в mandala (register/resend actions). aboi — submodule, отдельная сессия.
- **Алертинг (Вариант B + C — §13.4):**
  - **B — Telegram-webhook:** при `success === false` опциональный вызов в `@letar/email`;
    дебаунс — алерт только на 3 подряд `success === false` одного типа;
    конфигурация: `TELEGRAM_ALERT_BOT_TOKEN`, `TELEGRAM_ALERT_CHAT_ID` в `.env.docker` (токен **не хранить в коде/плане**).
  - **C — Umami event:** `umami.track('smtp-failure', { type, appId, errorCode })` для трендов и % ошибок.
  - Оба варианта — опциональные (пустые переменные = отключено), без ломающих изменений API `@letar/email`.
- **✓ DoD:** canary (0.7) зелёный ≥ 3 суток подряд; 0 проигнорированных `SendEmailResult`; baseline зафиксирован.
- **Зависимости:** нет. Без доходящих писем resend бессмыслен.

### Этап 0.1 — Ротация утёкших OIDC-секретов Ключницы ✅ ПОЛНОСТЬЮ (сессии №2 + №7 + №8)

- **Проблема (подтверждено по коду):** 6 `clientSecret` в `trustedClients` записаны литералами в `auth.ts:193-281`;
  auth-hub — публичное дерево → секреты в публичной git-истории.
- ✅ **Код-часть (сессия №2):** литералы заменены на `requireOidcSecret('OIDC_<APP>_SECRET')` из `process.env`
  (fail-fast хелпер); переменные добавлены в `.env.local` (dev) и `.env.docker` (prod, не коммитятся) с текущими
  значениями. Grep по `clientSecret: '` чист. bump auth-hub 0.3.1→0.3.2.
- ✅ **Инфра-часть (сессия №8, 2026-06-04):** сгенерированы новые секреты для 6 старых клиентов + добавлен
  `OIDC_STUDIO_SECRET` (новый); обновлены `.env.docker` auth-hub + всех 6 клиентов на s2; seed 7/7; рестарт.
  Старые значения из git-истории отозваны.
- ⚠️ Очистка git-истории НЕ возвращает конфиденциальность (репо публичный) → **ротация обязательна**, filter-repo опционален.
- **✓ DoD:** в `auth.ts` нет строковых секретов (grep чисто); старые секреты отозваны; все клиенты логинятся на новых.
- **Зависимости:** нет. Делать в первой сессии вместе с Этапом 0.

### Этап 0.2 — Защита почтового сервера ✅ ОСНОВНАЯ ЗАЩИТА (2026-06-04)

- ✅ **fail2ban jail `maddy-submission`** настроен (2026-06-04): фильтр читает Docker json-log
  (`/var/lib/docker/containers/<id>/<id>-json.log`), regex `\\\"src_ip\\\":\\\"<HOST>:\d+\\\"`;
  `maxretry=5 / findtime=120s / bantime=86400s`; action `iptables-multiport port=587`; тест-бан прошёл.
- ✅ **Пароли сменены** для `kami@letar.best` и `admin@letar.best` (были атакуемые, сгенерированы 32-символьные).
  Новые значения — только в менеджере паролей владельца (не в коде/PLAN).
- ⏳ **Форвард на gmail** режется (DKIM/SPF) — чинится DKIM/SPF/DMARC Этапа 0; DKIM DNS-записи для
  `letar.best`, `neyroaboi.ru`, `premium.rosstil.ru` уже есть; `направа.рф` — **DKIM пока не трогать**:
  driving-school использует `letar.best` для отправки писем (SMTP_FROM на letar.best), собственный домен не отправляет.
  Конкретные хосты/ящики/пути конфигов — в приватном `.claude/OPS_JOURNAL.local.md` (§14.2).
- **✓ DoD:** ✅ brute-force IP банятся автоматически; ✅ пароль ящика сменён; ⏳ доставка на канареечный ящик подтверждена (0.7).
- **Зависимости:** нет (горящее). Пересекается с DKIM-настройкой Этапа 0.

### Этап 0.3 — Ревизия системы бэкапов (прод + локальные) ✅ ПОЛНОСТЬЮ (2026-06-04)

> **Проблема:** сейчас бэкапится много лишнего, а часть критичного — нет. Нужна единая продуманная стратегия.

- ✅ **Сузить scope синхронизации (Resilio Sync).** `.sync/IgnoreList` обновлён на s1 + s2
  (добавлены `.env.docker` / `.env.local` / `.env` → секреты не уходят в offsite Resilio).
- **Базы данных** ⏳ — проверить полноту охвата (все БД s1/s2), расписание и **ротацию**.
- ✅ **Конфиги Maddy** (2026-06-04): `/opt/maddy/backup.sh` тарует `maddy.conf` + `docker-compose.yml` +
  `credentials.db` + `aliases` + `dkim_keys/` → `/root/backups/maddy/maddy_YYYY-MM-DD.tar.gz`;
  cron 03:00 ежедневно, ротация 14 дней. Документировано в `backup-architecture.md`.
  ✅ rsync mail→s2 после каждого бэкапа → Resilio тянет на Windows/pinner2 (offsite).
- ✅ **Nginx Proxy Manager** (2026-06-04): бэкапы создавались штатно до мая; обнаружен баг
  `WORKSPACE_PATH` → nginx backup молча падал (HTTP 200, success=false). Фикс в `27960b3`,
  деплой ожидается от BlackCove. Ротация реализована (MAX=14 авто-бэкапов). Старые бэкапы
  почищены (27 удалено на s2, 35 на s1). Dry-run: nginx archive (737 файлов) валиден.
- ✅ **Локальные credentials** — стратегия задокументирована в `backup-architecture.md`
  (KeePassXC для секретов; git для кода; Resilio только для uploads+backups).
- ✅ **Resilio Sync R/O ключи** убраны из публичного `backup-architecture.md` → перенесены в
  `.claude/OPS_JOURNAL.local.md §14.4` (2026-06-04).
- **✓ DoD:** задокументирована единая стратегия (что/откуда/куда/ротация); IgnoreList синхронизирует только
  `uploads`+`backups`; Maddy-конфиги и DKIM в бэкапе; локальные креды защищены; восстановление проверено dry-run;
  Resilio-ключи убраны из публичного дерева.
- **Зависимости:** пересекается с Этапом 0.2 (Maddy) и 0.4 (secret-manager). Документация — `backup-architecture.md`.

### Этап 0.4 — Выделенный secret-manager для кредов ⏳ РЕШЕНИЕ ПРИНЯТО (2026-06-05)

> **Идея:** сейчас креды (личные владельца и прод) разбросаны по `.env.docker`/`.env.local` на разных машинах.
> Вынести в единый инструмент управления секретами.

- ✅ **Инструмент выбран: SOPS + age** (2026-06-05). Обоснование: self-hosted s2, один владелец, нет нового
  сервиса на s2. Файлы `.env.docker.enc` шифруются и хранятся в git. Приватный age-ключ — в KeePassXC.
  Расшифровка при деплое: `sops exec-env .env.docker.enc 'docker compose up'`. 152-ФЗ ✅.
  Infisical/Vault отклонены: избыточны при одном операторе.
- **Что покрыть:** прод-секреты (`.env.docker` всех приложений), OIDC client secrets (Этап 0.1), соц-секреты (Этап 8).
- **Связи:** Этап 0.1 (ротация OIDC), Этап 0.3 (бэкап), Этап 8 (соц-секреты per-владелец).
- **✓ DoD:** age-ключ сгенерирован; `.sops.yaml` настроен; пилот на одном приложении; процесс деплоя обновлён.
- **Зависимости:** не блокирует, желателен до Этапа 8.

### Этап 0.6 — Завершение ренейма `lena` → `letar` (исторические хвосты)

> Косметика и битые пути уже исправлены (сессия ренейма). Осталась **корзина C — load-bearing идентификаторы**:
> по части из них «добраться нужно, если не до всех». Каждый — отдельное решение (мигрировать / оставить с обоснованием).

- **PostgreSQL DB/user `lena_*`** (`lena_user`, `lena_premium`, `lena_imot`, `lena_kami`, `lena_driving_school`,
  `lena_auth`, `lena_password`) — production identity. Ренейм = `ALTER`/пересоздание ролей + обновление `.env.docker`
  - возможный downtime + бэкап. **Планово, не наспех.** Решить по каждой БД: мигрировать или оставить как историческое.
- **Пути бэкапов** `C:\BackupSync\lena` / `/home/backups/lena` — завязаны на Resilio (пересекается с Этапом 0.3).
- **Ключ localStorage** `lena-form-sync-queue` (`@letar/forms` pwa-offline) — смена ключа = сброс offline-очереди у
  существующих клиентов. Решить: мигрировать с fallback-чтением старого ключа или оставить.
- **Root-имя пакета** `@lena/source` (`package.json` + `bun.lock`) — ренейм требует регенерации lockfile; low-impact.
- **Хвосты (публичное дерево):** submodule Dockerfile-комментарии (`imot`, `driving-school`, `premium-rosstil`) —
  правка с коммитом внутри submodule + bump SHA.
- **✓ DoD:** по каждому идентификатору зафиксировано решение; где мигрируем — выполнено с бэкапом; `grep -i lena`
  чист либо остаток обоснован в этом этапе.
- **Зависимости:** БД-ренейм пересекается с бэкапами (0.3) и миграциями (§8 сквозные).

### Этап 0.5 — Nx module-boundary теги (§13.10)

- ✅ **Публичная часть (сессия №2):** тег `owner:letar` добавлен в 60 `project.json` публичного дерева
  (петы + infra + все `libs/*`); submodules исключены. depConstraint `owner:letar → [scope:shared, owner:letar]`
  в `eslint.config.mjs` — ESLint запрещает импорт коммерческого кода в петах. Проверено: 0 нарушений границ.
- ✅ **Submodule-часть (сессия №3, 2026-05-30):** тег `owner:commercial` добавлен в **10** коммерческих
  submodule-проектов (`nx show projects --with-tag owner:commercial`): aboi (+e2e), driving-school (+e2e +db),
  premium-rosstil, imot (+e2e), dsperevod (+e2e). Коммит внутри каждого submodule + bump SHA в letar.
  `premium-rosstil-e2e` пропущен (нет `project.json` → Nx не видит проект). Реципрокный constraint
  `owner:commercial → [scope:shared, owner:commercial]` добавлен в `eslint.config.mjs`; module-boundary чист (0 нарушений).
- **Зависимости:** нет. Делается до начала тиражирования библиотек.

### Этап 0.7 — Периодический canary-мониторинг доставки email

- **Цель:** ловить инциденты доставки (как сегодняшний — форвард режется gmail, неверный `SMTP_FROM`, брутфорс)
  **автоматически**, а не по жалобам. Проверять, что письмо реально **доходит** (round-trip), а не только «SMTP принял».
- **Механизм:** scheduled-задача (cron на сервере / health-скрипт) — раз в N минут:
  1. отправляет тестовое письмо через реальный `@letar/email` на канареечный ящик;
  2. читает входящие по **IMAP**, подтверждает получение в пределах таймаута;
  3. пишет метрику latency доставки.
- **Покрытие:** ключевые отправители per-домен (`noreply@letar.best`, `noreply@premium.rosstil.ru`, …) +
  проверка форвардов (напр. `kami@letar.best` → реальная доставка адресату).
- **Алерт при провале:** Telegram-webhook + Umami (переиспользуем алертинг Этапа 0); порог — N подряд неудач.
- **Реализация:** лёгкий скрипт/сервис (не e2e-фреймворк) — SMTP send + IMAP receive, запуск через cron/scheduled.
- **Зависимости:** Этап 0 (лог `SendEmailResult` + алертинг). Закрывает класс «письма молча не ходят».

### Этап 0.8 — Аудит соответствия 152-ФЗ (комплексная проверка)

> **Контекст:** требования 152-ФЗ уже частично выполнены (эталон aboi, cookie-баннер, согласия в формах, чекбоксы ПДн,
> страница /privacy). Документация — `.claude/docs/personal-data.md`. Этот этап — сквозной аудит **всех приложений**,
> которые собирают ПД, на полное соответствие закону.

**Охват:** все публичные приложения монорепо, собирающие ПД граждан РФ:

| Приложение      | ПД собирает?                    | Аудит нужен? |
| --------------- | ------------------------------- | ------------ |
| auth-hub        | ✅ email, имя, IP, OAuth-данные | ✅ done с30  |
| aboi            | ✅ эталон — уже реализовано     | ✅ done с30  |
| premium-rosstil | ✅ email, имя, адрес доставки   | ✅           |
| imot            | ✅ email, телефон, имя          | ✅           |
| dsperevod       | ✅ email, имя                   | ✅ done с30  |
| driving-school  | ✅ email, имя                   | ✅           |
| kami            | ❌ только владелец              | —            |
| grandslamcup    | ✅ email, имя игроков           | ✅           |
| time            | ❌ только владелец              | —            |
| animatrona-*    | ❌ внутренние инструменты       | —            |
| dashboard-agent | ❌ внутреннее                   | —            |

**Чеклист для каждого приложения** (из `personal-data.md §7`):

- [ ] Страница `/privacy` с политикой ПДн (оператор, цели, сроки, права субъекта, контакт `privacy@<domain>`)
- [ ] Дисклеймер в футере
- [ ] Cookie-баннер с opt-in для аналитики/маркетинга (функциональные — всегда вкл)
- [ ] Кнопка «Настройки cookie» в футере (повторное открытие)
- [ ] `ConsentLog` в БД + `/api/consent` эндпоинт
- [ ] Чекбокс согласия в форме регистрации (**не предотмечен**, `consentAccepted: false` как default)
- [ ] Чекбокс в каждой форме, собирающей новые ПД (чекаут, заявка)
- [ ] Аналитика (Я.Метрика, Umami) — инициализируется **только после** `analytics: true` (consent-aware обёртка)
- [ ] Право на удаление аккаунта в ЛК (`deleteAccountAction`)
- [ ] Сервер находится в России ✅ (s1/s2 — RU-серверы, ст. 18 ч. 5 ФЗ-152)
- [ ] **Уведомление в РКН** подано (pd.rkn.gov.ru — авторизация через Госуслуги ИП/ЮЛ) — **блокер публичного запуска**

**Что нового (сверх уже реализованного в aboi):**

1. **Уведомление в РКН** — подать через pd.rkn.gov.ru для каждого оператора. Получить PDF с номером → занести в README/PLAN приложения.
   - ✅ **aboi (neyroaboi.ru):** подано 16.05.2026 оператором-владельцем (ИП), рег. № 100286690. PDF у владельца.
     ⚠️ Проверить при аудите aboi: заявленный ЦОД (ООО «Цифровые решения», Москва) — сверить с фактическим хостингом s2.
     Трансграничная передача — по тому же принципу, что у letar (см. ниже): для RU-IP зарубежных провайдеров быть не должно.
   - ✅ **letar (`*.letar.best`: auth-hub, grandslamcup и пр.) + driving-school (направа.рф — тот же оператор-ИП
     владельца letar):** подано 02.06.2026 оператором-владельцем (ИП),
     рег. № 100306050. Дата начала обработки 22.04.2026. 3 цели (договор, продвижение, регистрация на сайте);
     СКЗИ КС1 (TLS); ЦОД — ООО «Цифровые Решения», Москва. PDF у владельца.
     ✅ **Решение (2026-06-10):** «трансграничная передача не осуществляется» корректна — 152-ФЗ/уведомление
     касаются ПДн граждан РФ; для RU-IP зарубежные провайдеры (Google/GitHub/Facebook, Telegram) скрываются
     гео-блокировкой (Этап 6.7), а поведение для иностранных IP — вне сферы уведомления. Уточнение уведомления
     не требуется; **Этап 6.7 становится обязательным** для соответствия заявленному.
   - ❌ Остальные операторы (premium-rosstil, imot, dsperevod) — не подано.
2. **Тираж cookie-баннера** на все ПД-собирающие приложения (сейчас только aboi — эталон).
3. **Проверка чекбоксов** — убедиться, что нигде нет `consentAccepted: true` как defaultValue (нарушение ФЗ).
4. **Consent-aware аналитика** — убедиться, что Umami/Я.Метрика нигде не грузится до согласия.
5. **Право на удаление** — `deleteAccountAction` во всех аккаунт-имеющих приложениях.
6. **Трансграничная передача** — проверить: Telegram (мессенджер), Google OAuth, Facebook OAuth — передача ПД
   за рубеж (при Этапе 6.7 скроем для RU-IP, но нужна оговорка в /privacy пока они доступны).

**DoD:**

- [ ] По каждому приложению из таблицы выше: все пункты чеклиста ✅ или обоснованно N/A
- [ ] Уведомление в РКН подано, номер оператора зафиксирован
- [ ] Нет `consentAccepted: true` как default нигде в кодовой базе (Grep-проверка)
- [ ] Аналитика везде consent-aware

**Зависимости:** независим. Можно делать параллельно с другими этапами. Рекомендуется перед масштабным ростом аудитории.

### Этап 1 — Фундамент библиотек ✅ ВЫПОЛНЕНО (сессия №1, 2026-05-30)

- `@letar/pin-auth`: совместимость с Better Auth (`emailVerified: Boolean`, таблица `verification`); хуки
  переиспользуемы вне driving-school; брендинг шаблонов в конфиг. _(совместимость/брендинг — частично, по мере тиража)_
- ✅ `@letar/auth/client`: `<ResendVerificationButton authClient email callbackURL/>` со встроенным cooldown;
  «лёгкий путь» — обёртка над `authClient.sendVerificationEmail`. bump 0.2.0→0.3.0 + CHANGELOG.
  ⏳ Реэкспорт pin-auth хуков **отложен**: на уровне `libs/` нет cross-lib резолва по имени пакета
  (нет `node_modules/@letar`, paths только в приложениях) — cooldown инлайнен в кнопке. Отдельная задача.
- **Security hardening (§13.1–13.2–13.8) — ✅ сделано:**
  - ✅ **SSE-токен вместо email в URL (§13.1):** `streamToken` генерируется в `token-manager`, передаётся в адаптер
    `createToken`, `useVerificationStream` принимает его. **Аддитивно** — email-путь сохранён; полное удаление
    email-ключа + SSE-роут на `${streamToken}` — при cutover driving-school (Этап 7).
  - ✅ **Timing-safe PIN compare (§13.2):** `crypto.timingSafeEqual` в `pin-validator.ts` (+null-guard). Тесты.
  - ✅ **Single-use авто-логин токен (§13.8):** усилён контракт адаптера `updateTokenForAutoLogin` (атомарная
    замена + одноразовость, док/типы). Полная enforcement (`used`-флаг у потребителя) — Этап 7.
  - ✅ **UX при SMTP-ошибке (§13.4):** в `ResendVerificationButton` cooldown стартует только при `success`.
  - ✅ Добавлена тест-инфраструктура pin-auth (project.json/vitest/tsconfig.spec) + 11 тестов; bump 0.1.0→0.2.0 + CHANGELOG.
- **Зависимости:** нет (публичные `libs/`). Стартовая сессия реализации.

### Этап 1.5 — Серверная абстракция `createAuth(profile)` ⭐ ⏳ В РАБОТЕ (сессия №9, 2026-06-04)

> **Зачем:** сейчас каждое приложение собирает `betterAuth({...})` руками (auth-hub ~390 строк, копируются при
> тираже). Цель — свести различие приложений к объекту `AuthProfile` (§2.2/§4), убрать дублирование, сделать смену
> режима (коммерс «переходит на letar.best») конфигом, а не переписыванием `auth.ts`.

1. ✅ **Spike + реализация `createAuth()` в `@letar/auth/server`** (сессия №9): режимы `standalone` / `hub-client` /
   `hub-provider`; email-коллбэки инжектируются приложением; DB-адаптер остаётся app-side; generic-перегрузки;
   16 Vitest тестов; bump 0.3.0→0.4.0. Совместимость с ZenStack v3 ORM (`as never`) подтверждена.
   Ограничение: `additionalFields` не выводятся автоматически через фабрику (Better Auth generic inference ограничен) →
   приложения используют `as unknown as SessionUser`. Задокументировано в коде.
2. ✅ **Эталон-миграция standalone** → **dsperevod**: `auth.ts` заменён декларацией профиля (90→35 строк).
3. ✅ **Эталон-миграция hub-client** → **time**: `auth.ts` 84→20 строк, без DB-адаптера.
4. ⏳ **Осталось по DoD:** `libs/auth/README.md` описывает 3 режима; E2E dsperevod проверить behavior-parity;
   контракт §4 финализирован; под-вопросы п.4 (реестр hub-клиентов ✅ закрыт сессией №7).

- **✓ DoD:** `createAuth()` покрыт тестами; dsperevod (`standalone`) + archetest/time (`hub-client`) работают на
  фабрике, E2E зелёный; их `auth.ts` сократился до декларации профиля; `libs/auth/README.md` описывает 3 режима;
  контракт §4 финализирован; решены под-вопросы п.4.
- **Зависимости:** Этап 1. **Блокирует** постановку новых потребителей на режимы (Этапы 4, 6, 7, 8).

### Этап 2 — Resend email-верификации (исходная боль) — 🟢 эталон aboi ✅ (auth-hub ✅)

> **Сессия 2026-05-30 (auth-hub):** ✅ resend на `/sign-in` через `<ResendVerificationButton>` (@letar/auth/client)
> для обоих сценариев — авторегистрация и вход неверифицированного (`verifyEmailSent` в `login.action.ts`);
> ✅ захват `SendEmailResult` + `reportEmailFailure` в `emailVerification.sendVerificationEmail` (`lib/auth.ts`);
> ✅ rate-limit `/send-verification-email` `{60,5}`. bump 0.3.2→0.4.0 + CHANGELOG. ⏳ Follow-up: у auth-hub нет
> vitest/e2e инфраструктуры — unit/Playwright для resend не написаны; точечный per-email rate-limit (кастомный ключ).
>
> **Сессия 2026-05-31 (aboi — ЭТАЛОН ✅):** ✅ resend на `/sign-in` при `EMAIL_NOT_VERIFIED` (`<ResendVerificationButton>`,
> email из формы, cooldown только при успехе §13.4); ✅ resend-форма на `/verify-email` при ошибке (email вводится
> заново — токен Better Auth 1.6.x это stateless JWT, контекста формы не несёт); ✅ захват `SendEmailResult` +
> `reportEmailFailure` для verification и password-reset (`lib/auth.ts`); ✅ rate-limit `/send-verification-email`
> `{60,3}`; ✅ Umami-события (§13.9) `verification-email-{sent,resent}` + `email-verified` (`lib/analytics.ts`);
> ✅ **E2E зелёный (chromium):** регистрация → тупик → resend → cooldown → верификация по токену → автологин на
> `/profile` (`aboi-e2e/email-verification.spec.ts`). bump aboi 0.23.2→0.24.0 + CHANGELOG; коммит в 2 submodule + bump SHA.
> ⏳ Follow-up: email-уровень rate-limit `{3600,5}` с ключом ip+email (Better Auth не умеет per-email ключ нативно).
> ✅ **dsperevod (сессия №6, 2026-06-02):** resend на `/sign-in` + resend-форма на `/verify-email` + analytics.ts +
> rate-limit + autoSignInAfterVerification + миграция на @letar/email + E2E зелёный. bump 0.5.0.
> ✅ **Этап 2 п.3 ремедиация завершена (2026-06-04):** aboi — 0 застрявших, dsperevod — 0 застрявших.
> auth-hub — 12 застрявших (все зарегали до деплоя resend-фикса, большинство через VK OAuth) → bulk `UPDATE "User" SET "emailVerified"=true` выполнен на prod. Итог: 27/27 верифицированы.

1. ✅ **aboi (эталон):** `/sign-in` `EMAIL_NOT_VERIFIED` → блок + resend (email из формы); `/verify-email` error →
   resend; захват `SendEmailResult`; `rateLimit.customRules['/send-verification-email'] = { window: 60, max: 3 }`.
2. **Тираж:** dsperevod → auth-hub (i18n нет → ru-хардкод; гейт только prod → тест с принудительным флагом).
   kami — Этап 6; premium-rosstil — Этап 4.
3. ✅ **Ремедиация бэклога застрявших (2026-06-04).** aboi: 0 застрявших (2 юзера — все верифицированы).
   dsperevod: 0 застрявших (3 юзера — все верифицированы). auth-hub: bulk-верификация 12 застрявших
   (OAuth VK-аккаунты от апреля, до resend-фикса) → 27/27 верифицированы.

- **✓ DoD:** на эталоне (aboi) E2E «регистрация → тупик → resend → cooldown → верификация» зелёный ✅ (chromium);
  ✅ бэклог застрявших (п.3) — закрыт (2026-06-04). **Этап 2 — ПОЛНОСТЬЮ.**
- **Зависимости:** Этап 1.

### Этап 3 — Admin «Пользователи» + ручная верификация ✅ ПОЛНОСТЬЮ (2026-06-04)

- ✅ **aboi:** `admin/users` страница (фильтр `isAnonymous: false`) + `VerifyButton` + `verifyUserAction` + «Пользователи» в `AdminNav`.
- ✅ **kami:** `admin/users` страница + `VerifyButton` + `verifyUserAction` + «Пользователи» в `AdminSidebar`.
- ✅ **auth-hub:** `VerifyButton` + `verifyUserAction` добавлены в существующую `admin/users`.
- ✅ **dsperevod:** `verifyUserAction` добавлен в `user.action.ts` (с `logAudit`) + `VerifyButton` в колонку «Действия».
- ✅ **premium-rosstil:** `verifyUserAction` + `VerifyButton` + колонка «Верификация»; запрос переведён на `select`.
- Server actions под `requireAdmin`, меняют **только `emailVerified`**; DB-клиент по паттерну приложения (§9-D7). ✅ enhanced Prisma (dsperevod, premium) — политики `@@allow('all', auth().role == ADMIN)` разрешают обновление.
- **Зависимости:** частично Этап 1; можно параллельно с Этапом 2.

### Этап 4 — premium-rosstil: миграция на Better Auth (§9-D4 = «мигрировать») ✅ ПОЛНОСТЬЮ (сессии №15–16)

- ✅ **Шаг 1:** `register-form.tsx` → `authClient.signUp.email()`; удалён `/api/auth/register/route.ts`.
- ✅ **Шаг 2:** `signin-form.tsx` resend → `authClient.sendVerificationEmail()`; удалён `/api/auth/resend-verification/route.ts`.
- ✅ **Шаг 3:** `forgot-password-form.tsx` → `authClient.requestPasswordReset()` (BA 1.6.11: метод `requestPasswordReset`, не `forgetPassword`); `reset-password-form.tsx` → `authClient.resetPassword()`; удалены `/api/auth/request-reset`, `/api/auth/reset-password`.
- ✅ **Шаг 4:** удалены `lib/tokens.ts`, `lib/rate-limit.ts` + все потребители (`verify-email/route.ts`, `cleanup-rate-limits/route.ts`).
- ✅ **Шаг 5:** schema.zmodel — убрано `Verification.type`, дропнута `LoginAttempt`; migration `20260604155648_remove_custom_auth_fields`.
- ✅ **Шаг 6:** `verify-email/page.tsx` переписан на `authClient.verifyEmail()` + ResendVerificationButton при ошибке (по эталону dsperevod).
- `requireEmailVerification` **не включаем** (§9-D3). Пароли совместимы (bcrypt).
- **Зависимости:** Этапы 1–2 ✅.

### Этап 5 — Богатый pin-auth флоу (коды+ссылки+cross-tab) ✅ ПОЛНОСТЬЮ (2026-06-04)

- ✅ **premium-rosstil:** хук `sendVerificationEmail` → PIN + ссылка в одном письме; адаптеры
  `PinValidatorAdapter` (namespace через `identifier`, без поля type); SSE endpoint; server actions
  (verify-pin, resend через BA API, auto-login с HMAC-cookie); страница `/auth/verify-pin` +
  Chakra PinInput + `usePinVerification`; cross-tab sync; register → verify-pin редирект;
  sign-in EMAIL_NOT_VERIFIED → resend + редирект. bump 0.74.0→0.75.0.
- **Зависимости:** Этап 1 ✅; эталон driving-school.

### Этап 6 — kami: авторизация ✅ ПОЛНОСТЬЮ (2026-06-05, сессии №18–19)

- ✅ **§13.7** — `offline_access` scope в kami + фабрику. Коммит `93f713e`.
- ✅ **Фабрика расширена** — `rateLimit`, `account`, `secondaryStorage`, `mapProfileToUser` для hub-client. Коммиты `3649f19`, `10acacd`.
- ✅ **kami/auth.ts** — 241→125 строк на `createAuth({ mode: 'hub-client' })`.
- ✅ **Кнопка Войти** — сразу редиректит на Ключницу, без промежуточной страницы. Коммит `576f00f`.
- ✅ **OIDC flow отлажен** (5 последовательных багов): `OIDC_CLIENT_ID` не в docker-compose; `nextCookies()` не последним;
  `cookies().set()` в Server Component → `OidcPendingCapture`; oidc-capture снимал OIDC params с URL → убран redirect;
  `name_is_missing` → `mapProfileToUser` fallback. Коммиты `83583af`, `35e41b0`, `557ae0f`, `6dec301`, `10acacd`.
- ✅ **auth-hub** — все фиксы задеплоены; OIDC flow работает end-to-end.
- **Зависимости:** Этап **1.5** ✅; Этап 1 ✅.
- ⏳ **Проверка OIDC refresh на проде** — убедиться что refresh_token сохраняется в `account` после первого входа.
- ✅ **Этап 6.51 — RP-initiated logout ✅ ПОЛНОСТЬЮ (2026-06-06, сессия №23):** `createLogoutAction` расширен `OidcLogoutOptions`;
  после `signOut()` → редирект на `https://auth.letar.best/api/auth/oauth2/endsession?client_id=...&post_logout_redirect_uri=...`;
  auth-hub удаляет oauthAccessTokens + сессию → реальный выход. `id_token_hint` не нужен — `client_id` достаточен по spec.
  Все 6 hub-client приложений обновлены (kami `.env` создан + `auth.actions.ts`; animatrona-tracker `.env` + `auth.actions.ts`;
  archetest/grandslamcup/time/dashboard — код уже был с предыдущих сессий). `BETTER_AUTH_OIDC_ISSUER=https://auth.letar.best`
  добавлен в `.env.docker` всех 6. Задеплоено BlackCove (s1: kami ✅; s2: animatrona-tracker/dashboard/archetest/grandslamcup/time ✅).

✅ **Этап 6.5.1 — UX passkeys ✅ ПОЛНОСТЬЮ (2026-06-06, сессия №24):** commit `812d518`, деплой у BlackCove.

✅ **Этап 6.6 — Telegram-авторизация ✅ ПОЛНОСТЬЮ (2026-06-08, сессия №25):** commit `461abde`, деплой запрошен у BlackCove.
Реализовано: `telegramPlugin()` (BA-плагин), таблица `telegramToken`, кнопка `TelegramSignInButton` на /sign-in.
После деплоя: добавить `TELEGRAM_BOT_TOKEN/USERNAME/WEBHOOK_SECRET` в `.env.docker`, зарегистрировать webhook.

**➡️ Следующий старт:** **Этап 7** (driving-school на общую библиотеку) или **Этап 8.5** (Mini App-кабинет).

### Этап 6.5 — Passkeys / WebAuthn ✅ инфраструктура (2026-06-05, сессия №21) + ✅ UX (Этап 6.5.1, сессия №24)

- **Реализовано:** кастомный `passkeyPlugin()` (@simplewebauthn/server v13) для auth-hub; таблица `passkey`;
  компоненты `PasskeySignInButton` / `PasskeyRegisterButton`; кнопка на /sign-in. Задеплоено BlackCove ✅.
- **Passkey не заменяет email** — fallback при смене устройства остаётся.
- **rpID** = `letar.best`, **origin** = `https://auth.letar.best`. HTTPS ✅.

#### 🔴 Текущие проблемы (обнаружены после деплоя)

1. **"Не удалось получить параметры входа"** — `authenticate/options` возвращает ошибку когда в БД 0 passkeys.
   Надо: возвращать `allowCredentials: []` → браузер переходит в **discoverable credential flow** (resident key).
2. **Кнопка показывается всем** — при клике без зарегистрированного passkey → ошибка вместо внятного сообщения.
3. **Нет пути регистрации** — `PasskeyRegisterButton` создан, но нигде не встроен в UI (нет в профиле/настройках).

#### ⏳ Этап 6.5.1 — UX passkeys: правильное поведение как у GitHub/Google

> **Источники:** [web.dev conditional UI](https://web.dev/articles/passkey-form-autofill),
> [WebAuthn W3C Level 3](https://www.w3.org/TR/webauthn-3/), Google passkey UX guidelines.

**Ключевой инсайт:** GitHub/Google **не показывают кнопку** — браузер сам предлагает passkey
в дропдауне автозаполнения поля email. Это называется **Conditional UI** (`mediation: 'conditional'`).
Явная кнопка нужна только как fallback для браузеров без Conditional UI.

##### Шаг A — Починить сервер (быстрый фикс)

```typescript
// plugin.ts: passkeyAuthOptions
// Всегда возвращать 200 с options, даже если passkeys = 0
// allowCredentials: [] → discoverable/resident key flow
const options = await generatePasskeyAuthenticationOptions(passkeys) // passkeys может быть []
return ctx.json(options)
// Убрать throw/error, только return ctx.json(options)
```

##### Шаг B — Conditional UI (главная фича, «как GitHub»)

```
Что происходит с Conditional UI:
1. Страница загружается → в фоне стартует navigator.credentials.get({ mediation: 'conditional' })
2. Пользователь кликает на поле email → браузер показывает дропдаун с passkeys рядом с обычными паролями
3. Пользователь выбирает passkey → браузер показывает Touch ID / Face ID / Windows Hello
4. Сессия создана → редирект
Кнопки нет вообще. Всё бесшовно.
```

**Изменения:**

- `LoginForm`: добавить `autoComplete="username webauthn"` на поле email
- `PasskeySignInButton` → переименовать в `usePasskeyConditionalAuth` (хук)
- Хук запускается при монтировании страницы: `startAuthentication({ optionsJSON, useBrowserAutofill: true })`
- При успехе → сессия + редирект на callbackUrl
- Явная кнопка остаётся как fallback (с проверкой `PublicKeyCredential.isConditionalMediationAvailable`)

##### Шаг C — Регистрация: «Добавить passkey» после входа

Паттерн Google/Apple: **после успешного входа** (через пароль/OAuth/magic-link) → ненавязчивый
баннер внизу:

```
┌─────────────────────────────────────────────────────────────┐
│ 🔑 Войдите быстрее в следующий раз                          │
│ Добавьте ключ доступа — Touch ID / Face ID / Windows Hello  │
│                          [Добавить]  [Не сейчас]            │
└─────────────────────────────────────────────────────────────┘
```

- Показывать **один раз** (localStorage-флаг `passkey_prompt_dismissed`)
- Не показывать если: уже есть passkey на этом устройстве / пользователь отказался
- Компонент `PasskeyPromptBanner` — появляется на `/auth/post-login` или в профиле

##### Шаг D — Управление ключами в профиле

Новая секция `/profile` или `/settings` → **«Ключи доступа»**:

```
Ключи доступа
├── MacBook Pro (Touch ID)         Добавлен 05.06.2026  [Удалить]
├── iPhone 15 Pro (Face ID)        Добавлен 05.06.2026  [Удалить]
└── [+ Добавить ключ доступа]
```

- Таблица passkeys из БД (by userId)
- Переименование (name field)
- Удаление: `DELETE /api/auth/passkey/delete` (эндпоинт нужно добавить в плагин)
- `PasskeyRegisterButton` встроить сюда

##### DoD Этапа 6.5.1 ✅ ВЫПОЛНЕНО (сессия №24, 2026-06-06)

- ✅ **A**: `authenticate/options` возвращает 200 при 0 passkeys (`allowCredentials: []` discoverable flow)
- ✅ **B**: `autocomplete="username webauthn"` на email-инпуте; хук `usePasskeyConditionalAuth`
- ✅ **B**: явная кнопка скрыта когда conditional UI доступен, показывается только как fallback
- ✅ **C**: `PasskeyPromptBanner` в `/profile` (1 показ, dismissable, localStorage)
- ✅ **D**: `/profile/passkeys` — список + добавить + удалить; ссылка в навигации профиля
- ✅ `DELETE /passkey/delete` добавлен в плагин
- ✅ typecheck ✅ lint ✅

**Зависимости:** Этап 6.5 инфраструктура ✅. Можно делать без блокеров.

- **Целевые приложения:** kami ✅, time ✅, grandslamcup ✅; archetest ❌ (разовые пользователи).
- **Зависимости оригинального этапа:** Этап 6 (kami auth) ✅.

### Этап 6.6 — Telegram-авторизация в Ключнице ✅ ПОЛНОСТЬЮ (2026-06-08, сессия №25)

- **Реализовано:** `telegramPlugin()` — кастомный BA-плагин; таблица `telegramToken`; кнопка на /sign-in.
  Флоу: сайт генерит one-time token → `t.me/<bot>?start=<token>` → START → webhook → polling → сессия.
- **Заглушка email:** `<telegramId>@telegram.local` (аналог VK `${id}@vk.com`).
- **Сейчас не было** (в auth-hub: github/google/facebook/vk/yandex/magic-link/OIDC). Добавлено.
- **Прообраз в монорепо:** driving-school уже имеет модели `TelegramLink` + `TelegramLinkToken` (привязка
  через токен) — взять за основу, как pin-auth.
- **Подход (комбинируемо):**
  - **Бот + deep-link токен (ядро):** сайт генерит one-time токен → `t.me/<bot>?start=<token>` (или QR) →
    Start → бот связывает Telegram-identity с сессией → вход. Идеален для cross-device.
  - **Mini App (TMA):** WebApp в Telegram отдаёт `initData` (HMAC по bot-token) → сервер валидирует → сессия;
    внутри — кабинет identity (профиль, активные сессии, управление email/склейка, 2FA).
  - **Login Widget:** опционально.
- **Отдельный бот для auth_hub** (владелец готов завести). Bot-token = секрет → та же Tier-модель (общий бот
  Ключницы = Tier 1 / свой бот клиента = Tier 2, §2.3).
- **Безопасность:** серверная валидация `hash`/`initData` (HMAC-SHA256 по bot-token). Встроенного
  Telegram-провайдера в Better Auth нет → кастомный плагин/эндпоинт (сверить community-плагины).
- **Команды бота:** `/start` (с payload — подтверждение входа/привязки), `/login`, `/link`/`/unlink`, `/help`,
  кнопка-меню «Открыть кабинет» (Mini App).
- **Зависимости:** Ключница (auth-hub); пересекается с Mini App-кабинетом (управление email — Этап 8.5).

### Этап 6.7 — Гео-блокировка зарубежных провайдеров для российских IP ✅ КОД (2026-06-10, сессия №29)

> **Правовой контекст:** по 149-ФЗ (ред. 2024–2025) и подзаконным актам РКН российские ресурсы обязаны ограничивать
> использование иностранных сервисов для аутентификации пользователей из РФ. Под ограничение попадают:
> Google, Facebook (Meta\*), GitHub, а также Telegram. VK, Яндекс — российские, под ограничение не попадают.

**Реализация (сессия №29):**

- `auth-hub/src/lib/geo.ts` — `getCountryCode()`: читает `x-forwarded-for` (NPM уже выставляет), lookupv через `geoip-lite` (MaxMind GeoLite2 бандлится в пакете, без внешних API и без изменений NPM).
- `sign-in/page.tsx` — Server Component: фильтрует `google/github/facebook` из OAuth-провайдеров, скрывает `TelegramSignInButton` для RU-IP. Fallback: нет заголовка → показывать всё.
- `oauth-buttons.tsx` — принимает проп `providers` (раньше хардкод).
- Passkeys оставлены доступными — локальный механизм без иностранного сервиса.
- typecheck ✅ lint ✅. commit `b80de69`. Деплой запрошен BlackCove (msg #754).

**Не реализовано (опционально):**

- ⏳ `proxy.ts` блокировка `/api/auth/callback/{google,facebook,github}` для RU-IP — UI-мера достаточна, API-эндпоинты остаются (обход через прямой запрос теоретически возможен).
- ⏳ NPM-уровень (`X-Country-Code` через `ngx_http_geoip2_module`) — требует пересборки NPM-образа, не даёт преимущества над текущим решением.

**DoD:**

- ✅ `/sign-in` скрывает Google/Facebook/GitHub/Telegram для RU-IP
- ✅ Для dev-окружения показывается всё (нет заголовка → fallback)
- ⏳ `proxy.ts` блокировка API-эндпоинтов (опционально, не блокирует)
- N/A GeoIP2 заголовок через NPM — заменено `geoip-lite` (лучше)

**Зависимости:** Этапы 6.5, 6.6 ✅.

### Этап 7 — driving-school: на общую библиотеку

- Перевести на обновлённую `@letar/pin-auth` (выровнять с Этапом 5) и на `createAuth({ mode: 'standalone', ... })`,
  сохранив весь богатый UX и `organization` (teams).
- **Зависимости:** Этапы 1, 5, **1.5**.

### Этап 8 — Соц-секреты per-владелец + админка (§2.3, §9-D5)

- **UI выбора режима в админке коммерческого проекта** (informed consent §2.3):
  - **Tier 1 → `hub-client`:** «перейти на авторизацию letar.best» с показом рисков (бренд, домен письма, риск бана,
    миграция identity, обработчик ПДн). Технически = регистрация проекта hub-клиентом Ключницы (реестр — см. Этап 1.5 п.4)
    - миграция данных (§8.5).
  - **Tier 2 → `standalone` + свои ключи:** владелец вводит свои OAuth clientId/secret; secret **шифруется at-rest**
    в БД его проекта; `createAuth({ social: { source: 'db' } })` читает их при старте/reload. **Без runtime-динамики
    провайдеров** (решение ревизии №3) — D8 не нужен.
- ✅ **Миграция auth-hub на `createAuth({ mode: 'hub-provider' })`** — выполнено (сессия №33). Вынести захардкоженные OIDC-секреты auth-hub в secret-store (Этап 0.4) — остаётся.
- **✓ DoD:** коммерс может в админке выбрать Tier 1/Tier 2 с показом рисков; Tier 2-секреты шифруются at-rest и
  подхватываются `createAuth()`; auth-hub работает на фабрике; нет строковых секретов в коде.
- **Зависимости:** после auth-унификации (этапы 1, **1.5**, 2–7). Самостоятельный крупный трек.

### Этап 8.5 — Несколько email на аккаунт (account linking / merge)

- **Фича:** управление своими email в профиле (как GitHub) — привязка/подтверждение нескольких адресов к
  одному аккаунту, вход по любому. Better Auth `accountLinking` линкует только по **одинаковому** email; для
  **разных** адресов нужна кастомная merge-логика (прообраз — `mergeAnonymousAccount` в aboi).
- **Merge:** выбрать canonical-аккаунт → перепривязать `Account`/сессии/связанные данные → погасить дубли →
  аудит. **Необратимо → бэкап БД обязателен.**
- **Разовая операция владельца:** склейка личных email в Ключнице — ✅ **ВЫПОЛНЕНА 2026-05-30** (§14.1):
  canonical `kami@letar.best`, 5 провайдеров (credential, github, google×2, yandex) на одном аккаунте.
  ✅ **Перенос данных в kami (2026-06-05):** `infra/migrations/kami-owner-migration.ts` — 4 AudioFile
  перенесены с `letarkami@gmail.com`, оба старых аккаунта удалены, `kami@letar.best` получил роль ADMIN.
  ⏳ **Осталось** — запустить скрипты на s2 (скрипты готовы в `infra/migrations/`, 2026-06-05):
  войти в каждое приложение через Ключницу → `DRY_RUN=1` проверка → выполнить.
  `dashboard-owner-migration.ts` (port 5436), `archetest-owner-migration.ts` (port 5441),
  `animatrona-tracker-owner-migration.ts` (port 5439).
- **Зависимости:** Ключница (auth-hub); правовой аспект §2.6.

### Этап 9 — Документация — сквозной (§11)

---

## 8. Сквозные требования

- **i18n:** `auth.verification.*` для `[locale]`-приложений (aboi, kami, dsperevod, premium-rosstil); auth-hub — ru-хардкод.
- **Rate-limit:** серверный (`/send-verification-email`, `/sign-up/email`). ⚠️ Дефолтный store Better Auth —
  **in-memory** (сброс при рестарте, не общий между инстансами Docker) → для production задать персистентный store
  (БД/secondary storage), иначе rate-limit иллюзорен. Ключ = `ip + email` (§13.3).
- **SSE-масштабирование:** verification-stream sticky к одному инстансу; при горизонтальном масштабе событие на
  инстансе A не дойдёт до клиента на B без pub/sub. Текущее допущение — однопроцессный деплой; зафиксировать явно.
- **Миграции:** на боевых данных — версионированные `db:migrate` (НЕ `db:push`); бэкап + проверка rollback до старта.
- **Безопасность:** ручная верификация только `requireAdmin`; access-policy для enhanced Prisma; секреты — шифрование
  at-rest; resend не раскрывает существование юзера.
- **UX:** cooldown «Отправить повторно через {n} с»; успех — inline; коды + ссылка в письме.
- **Тесты:** Vitest + Playwright (регистрация → resend → cooldown → cross-tab → admin verify). TDD.

---

## 9. Точки принятия решения (развилка + рекомендация)

> **Решено:** D1 (aboi — первый эталон pin-auth флоу, поэтапно), **D2 (kami — сохранить все способы, унифицировать
> через фабрику — вариант (a)), D10 (абстракция = серверная фабрика `createAuth()`, ось из 3 режимов §2.2,
> «переход коммерса» = `hub-client`, Этап 1.5 — ревизия №3)**, D3 (premium `requireEmailVerification` — нет),
> D4 (premium → миграция на Better Auth), D5 (секреты per-владелец: админка Tier 1/Tier 2 с информированием),
> D6 (pin-auth отдельная), D7 (admin-таблица пер-приложение), D9 (Passkeys — делаем, Этап 6.5),
> модель владения §2, структура — Nx tags §2.5, алертинг — Telegram+Umami (Этап 0).

- **D2 — kami способы ✅ РЕШЕНО (a):** сохранить все способы (email/password, magic-link, OAuth, Ключница),
  реализацию унифицировать через `createAuth({ mode: 'hub-client' })`. Реализация — Этап 6 (после фабрики 1.5).
- **D10 — Форма и место абстракции ✅ РЕШЕНО (ревизия №3):** серверная фабрика `createAuth(profile)` в
  `@letar/auth/server` (§4); единая ось из 3 режимов §2.2; «переход коммерса на letar.best» = режим `hub-client`
  (OIDC-клиент Ключницы); Tier 2 = `standalone` + ключи из БД при старте. Выделен Этап 1.5 в Фазе B.
- **D8 — Динамика OAuth-провайдеров ✅ вне основной цели (ревизия №3):** для существующих коммерсов и для Tier 2
  (`standalone`, ключи из БД при старте/reload) **динамика НЕ нужна**. Остаётся **только** для гипотетической
  «SaaS Ключницы» (один auth-hub на несколько тенантов, multi-tenant CNAME §2.2). Если когда-нибудь понадобится —
  spike (1–2 дня) до реализации; варианты: (a) LRU-кэш инстансов с TTL; (b) proxy-провайдер с динамическим
  `clientId`/`clientSecret` из БД по `tenantId` [рекоменд. для MVP]; (c) отдельный контейнер per tenant.

---

## 10. Риски

- **Доставка писем** (Этап 0) — первопричина, без неё всё бессмысленно.
- **Схема pin-auth ↔ Better Auth** (`DateTime`/`verificationToken` vs `Boolean`/`verification`) — адаптеры + миграции.
- **enhanced Prisma + ручная верификация** — нужна access-policy, иначе action молча не применится.
- **Обход верификации** через admin — только `requireAdmin`, аудит-лог желателен.
- **Email-флуд** — серверный rate-limit на resend.
- **Соц-секреты Tier 1** — общий риск бана OAuth-приложения; владение/юридика (ToS); шифрование at-rest для БД.
- ~~**Правовое (152-ФЗ) локализация**~~ ✅ **ЗАКРЫТ (2026-06-04):** Ключница хостится в РФ → ст. 18 152-ФЗ выполнена. Остаётся: оператор/обработчик, договор поручения для Tier 1, согласия per-домен (§2.6).
- **Account-merge** — необратимо (перепривязка/удаление дублей) → бэкап БД + выбранный canonical до старта; боевые данные.
- **🟠 Переход режима = миграция identity (ревизия №3)** — `standalone → hub-client` меняет источник `user.id`
  (Ключница вместо локального) → существующие пользователи коммерса требуют миграции/перепривязки данных (класс §8.5),
  а не флага. Однонаправленно по стоимости (откат Tier 1→Tier 2 — ещё одна миграция). Закладывать бэкап + план переноса.
- **🟠 `hub-client` отдаёт домен письма Ключнице** — верификация/сброс уходят с `letar.best`, не с домена коммерса
  → потеря брендинга письма + спам-флаги на чужом домене (связь с первопричиной §2.4). Показывать в consent (§2.3).
- ~~**Регистрация hub-клиента** — `trustedClients` сейчас хардкод-массив + redeploy.~~ ✅ **ЗАКРЫТ (сессия №7):** клиенты
  хранятся в `oauthApplication` (БД), `trustedClients` удалён; регистрация через `db:seed` или `/admin/clients` UI.
  ⏳ Create/edit UI для новых клиентов — Этап 8 (admin).
- **Протечка абстракции `createAuth()`** — enhanced Prisma как adapter, 3 модели ролей, разнородные плагины
  (organization у driving-school, oidcProvider у auth-hub) могут не уложиться в единый профиль → **обязателен spike**
  (Этап 1.5 п.1) до реализации; риск over-engineering, если фабрика попытается покрыть всё сразу. Начать с 2 режимов.
- **Submodules** — коммит внутри + bump SHA; не смешивать с публичными `libs/` в одной сессии.
- ~~**🔴 Секреты в публичном репо**~~ ✅ **ЗАКРЫТ (сессия №8):** 6 OIDC client secrets ротированы; старые значения из git-истории отозваны; новые секреты только в `.env.docker` (не в коде).
- **Миграции на боевых данных** — `db:migrate` + бэкап + dry-run; особенно перенос FK в петах (§14.1) и merge (§8.5).
- **Rate-limit in-memory** — без персистентного store защита фиктивна после рестарта / на нескольких инстансах. ✅ **Решение принято (2026-06-04):** поставить Redis на s2; подключить как `secondaryStorage` в Better Auth rate-limit config (Этап 0/2 follow-up).
- **Бэкапы (Этап 0.3)** — критичный пробел: конфиги Maddy и DKIM-ключи не бэкапятся → потеря = невосстановимая почта;
  лишний scope синхронизации раздувает хранилище. Resilio R/O-ключи лежат в публичном репо (утечка).
- ~~**Ренейм БД `lena_*` (Этап 0.6)**~~ ✅ **РЕШЕНИЕ ПРИНЯТО (2026-06-04):** БД `lena_*` **не переименовывать** — исторический идентификатор, работает нормально, риск/downtime не оправданы. Этап 0.6 сужается до остальных хвостов (пути бэкапов, ключ `lena-form-sync-queue`, submodule Dockerfile-комментарии).

---

## 11. Документация (сквозной шаг)

- `libs/pin-auth/README.md` — Better Auth-совместимость + примеры вне driving-school.
- `libs/auth/README.md` — ⭐ **`createAuth(profile)` + 3 режима** (`standalone`/`hub-client`/`hub-provider`, §2.2/§4);
  resend-кнопка/хук (клиент — параметр).
- `libs/email/README.md` — лог `success === false`, формат строки.
- `.claude/docs/auth.md` — «Email-верификация и resend» + **модель владения, 3 режима и фабрика `createAuth()`** (§2/§4);
  чек-лист «как поставить новое приложение на режим».
- `.claude/docs/email.md` — `SendEmailResult`, SMTP-ошибки, `SMTP_FROM_EMAIL`, домен письма per-владелец.
- `.claude/rules/auth.md` — правило: при `requireEmailVerification` обязательны resend + rate-limit.
- `.claude/docs/backup-architecture.md` (Этап 0.3) — новая стратегия (только `uploads`+`backups`), бэкап Maddy/DKIM,
  бэкап локальных кредов; вынести Resilio R/O-ключи в `.claude/OPS_JOURNAL.local.md`.
- `.claude/docs/server-migration-letar.md` (Этап 0.6) — обновить статус по `lena_*` после решений по корзине C.
- PLAN/CHANGELOG/версии затронутых проектов. Перед merge — `docs-auto-sync` + `workflow:update-docs`.

---

## 12. Агенты и скиллы

- **`security-auditor`** — resend, ручная верификация, соц-секреты (Этап 8), access control.
- **`auth-policy-validator`** — `@@allow/@@deny` на `emailVerified` (enhanced Prisma).
- **`ui-architect`** — UX `EMAIL_NOT_VERIFIED`, баннеров, admin-таблиц, PIN-инпута, выбора Tier 1/2 (Chakra v3).
- **`e2e-test-writer`** — Playwright: регистрация → resend → cooldown → cross-tab → admin verify.
- **`refactor-expert`** — Этап 1.5: проектирование `createAuth()`, миграция приложений на фабрику без дублирования;
  перевод driving-school на библиотеку.
- **`better-auth` (skill)** — Этап 1.5 spike: единообразная сборка `socialProviders`/`plugins`, `genericOAuth` на
  OIDC-discovery, enhanced Prisma как adapter, динамика провайдеров (D8).
- **`code-quality-gate`** — перед коммитом (`nx format` → `nx lint` → `nx typecheck:tsgo` → test).
- **`migration-assistant` / `db-schema-assistant`** — миграции схем (pin-auth модели, `Verification.type`).

> Скиллы: `better-auth` (resend, rateLimit, OIDC, динамика провайдеров), `email-maddy` (`SMTP_FROM_EMAIL`),
> `chakra-theming`, `i18n-multilingual`, `zenstack-helper` (access policies), `deployment-assistant` (секреты).

---

## 13. Предложения архитектора (поверхностный анализ — нужны уточнения)

> ⚠️ **Предупреждение:** Это результат поверхностного анализа кода и документации без глубокого погружения
> в runtime-поведение и edge-case'ы. Каждый пункт требует обсуждения перед включением в план.
> Вопросы для уточнения — в §13.0.

### 13.0 Вопросы для уточнения — ЗАКРЫТЫ

1. **D1 / приоритет:** ✅ **aboi** — первый эталон Этапа 2.
2. **Passkeys:** ✅ **Делаем** — Этап 6.5, через Ключницу, для kami/time/grandslamcup.
3. **SMTP-алертинг:** ✅ **Вариант B + C** — Telegram-webhook + Umami events (Этап 0).
   Конфиг: `TELEGRAM_ALERT_BOT_TOKEN`, `TELEGRAM_ALERT_CHAT_ID` в `.env.docker`. Токен — только в `.env`, не в коде.
4. **Tier 2 / динамика:** ✅ **Отложено** до заключительных этапов — D8 в §9, spike перед реализацией.
5. **Ключница OIDC / refresh:** 🔲 Не подтверждено. Проверить при работе над Этапом 6 (kami).
6. **Rate-limit NAT:** ✅ NAT не актуален (пользователи из разных мест) — IP-based достаточен.

---

### 13.1 Уязвимость: SSE endpoint с email в URL

**Проблема.** Текущая реализация SSE: `/api/auth/verification-stream/${email}` — email в URL.
Любой может подписаться на поток чужого email и узнать факт верификации (enumeration юзеров).

**Рекомендация.** Заменить email-параметр на одноразовый `streamToken` (UUID), который:

- генерируется в сервер-экшене при создании PIN,
- хранится в `verificationToken.streamToken`,
- инвалидируется при верификации или истечении PIN.

```typescript
// Вместо /api/auth/verification-stream/${email}
// → /api/auth/verification-stream/${streamToken}
```

**Объём:** небольшой — `token-manager.ts`, SSE-роут, клиентский `useVerificationStream`.
**Зависимости:** Этап 1 (рефакторинг pin-auth). Включить как sub-task Этапа 1.

---

### 13.2 Timing-атака на PIN: нужен constant-time compare

**Проблема.** В `pin-validator.ts:90`: `verificationToken.pin !== pin` — строковое сравнение
уязвимо к timing-атаке (теоретически, при короткой сети и предсказуемом серверном времени).

**Рекомендация.** Заменить на `crypto.timingSafeEqual`:

```typescript
import { timingSafeEqual } from 'crypto'

const storedPin = Buffer.from(verificationToken.pin, 'utf8')
const inputPin = Buffer.from(pin.padEnd(storedPin.length), 'utf8')
const match = storedPin.length === inputPin.length && timingSafeEqual(storedPin, inputPin)
```

**Объём:** 5 строк в `pin-validator.ts`. Низкий риск регрессий.
**Зависимости:** нет — сделать в Этапе 1 как hardening.

---

### 13.3 Rate-limit: два уровня (IP + email) ✅ уточнено

NAT не актуален (§13.0.6). Итоговая конфигурация:

- **IP-уровень:** `{ window: 60, max: 10 }` — защита от burst-flood.
- **Email-уровень:** `{ window: 3600, max: 5 }` — защита от targeted harassment на конкретный адрес.
- Реализация: `rateLimit.customRules` Better Auth, ключ = `ip + email`.

---

### 13.4 SMTP graceful degradation: UX при failure ✅ включено в план

Включено в Этап 0 (алертинг B+C) и Этап 1 (UX `useResendCountdown`):

- Cooldown не применяется при `success === false`.
- Пользователю: нейтральное сообщение без деталей ошибки.
- Telegram: 3 подряд failure → webhook. Umami: event на каждый failure для трендов.
- ⚠️ `TELEGRAM_ALERT_BOT_TOKEN` и `TELEGRAM_ALERT_CHAT_ID` — только в `.env.docker`, не в коде.

---

### 13.5 Динамика OAuth-провайдеров Better Auth ✅ отложено → D8

Для существующих коммерческих приложений (каждое — отдельный деплой) динамика не нужна.
Актуально только для будущей «SaaS Ключницы». Перенесено в D8 §9, spike перед реализацией.

---

### 13.6 Passkeys / WebAuthn ✅ делаем → Этап 6.5

Решено. Описание в §7 Этап 6.5.

---

### 13.7 Ключница OIDC: refresh-token handling 🔲 проверить в Этапе 6

Sub-task для Этапа 6 (kami): проверить `accessTokenExpiration`, реакцию на 401, необходимость
`offline_access` scope. Включено в описание Этапа 6.

---

### 13.8 Авто-логин токен: гарантия single-use ✅ включено в план → Этап 1

Включено в security hardening Этапа 1. Адаптер `updateTokenForAutoLogin` — delete + create, не update.

---

### 13.9 Наблюдаемость: KPI верификации ✅ включено → Этап 0 + Этап 2

Umami events: отправка письма, успешная верификация, resend — добавить в server actions Этапа 2 (aboi).
Telegram alerting — в Этапе 0. Вместе дают картину: % доставки + % верификации.

---

### 13.10 Nx module-boundary tags ✅ включено → Этап 0.5

Описание в §7 Этап 0.5.

---

## 14. Операционный журнал и инфра-задачи

> 🔒 **Вынесено в приватный файл** `.claude/OPS_JOURNAL.local.md` (в `.gitignore`, не коммитится).
> Содержит инфра-детали прода (хосты, БД-креды, пути к бэкапам, доступ) — не публикуется в публичном репо `letar`.
> Сами задачи отражены в roadmap §7 как этапы Фазы A (0, 0.1, 0.2, 0.7).
