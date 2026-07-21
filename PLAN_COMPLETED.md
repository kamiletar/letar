# PLAN.md — Архив выполненных сессий (до 2026-06-21)

> Архив рабочего журнала (шапки) корневого `PLAN.md` — записи сессий старше ~1 месяца,
> перенесены при архивации 2026-07-21 (`/workflow:archive-completed`, §21).
> Активный журнал — см. верх `PLAN.md`.

---

> **Сессия №41 (2026-06-14, инфра-планирование — сервер s3):** Добавлен **§15 «Сервер s3 — медиа, e2e, IPFS, бэкап»**.
> Выбран конфиг **HDD S16** (12 ядер, 16 ГБ) — обоснован замером: пик `nx affected --target=e2e --parallel=3`
> с driving-school (98 spec, 17 projects) ≈ 8–9 ГБ; 16 E2E-сюитов в монорепо подтверждено (glob).
> §15 охватывает: медиа-сервер (upload API + ffmpeg + nginx HTTP Range, URL-схема `media.letar.best`);
> E2E-ранер (PostgreSQL per-suite, cron/webhook, Telegram-нотификации);
> IPFS: один Kubo — и піннер (:5001 API) и шлюз (:8080→nginx→`ipfs.letar.best`);
> **Pin Registry** (PostgreSQL в піннере): `Pin{cid,nodeId}` + `PinRef{appId,entityType,entityId}` —
> мультитенантность, ref-counted unpin, задел под распределённые пинеры через `nodeId`;
> гибридная видеодоставка: IPFS-gateway основной + nginx-fallback; Kubo chunk 1 МБ для seek;
> UX «маркетинг IPFS» — CID-бейдж в плеере, тултип, кнопка; Resilio s3 как третья offsite-нода.
> **➡️ Следующий старт:** **Этап 8** — Соц-секреты per-владелец + админка.
>
> **Статус:** ✅ план утверждён, реализация идёт. **Сделано:** Этап 1 + код-часть Этапа 0 (сессия №1); Этап 2 эталон aboi (сессия №5) + тираж на dsperevod (сессия №6); реестр hub-клиентов → БД (сессия №7); **Этап 0.1 ✅ ПОЛНОСТЬЮ** (сессия №8); **Этап 1.5 ✅ ПОЛНОСТЬЮ** — фабрика + эталоны + README + E2E 3/3 (сессии №9–10).
> **Сессия №12 (2026-06-04, инфра — риски 0.2 + 0.3):** ✅ **Этап 0.2 основная защита** — fail2ban jail
> `maddy-submission` (Docker json-log regex, maxretry=5/bantime=24h, iptables port 587); пароли
> `kami@letar.best` и `admin@letar.best` сменены на 32-символьные. ✅ **Этап 0.3 частично** — скрипт
> `/opt/maddy/backup.sh` (tar maddy.conf + dkim*keys + credentials.db + aliases, cron 03:00, ротация 14д);
> rsync mail→s2→Resilio offsite-цепочка; Resilio R/O ключи убраны из публичного `backup-architecture.md`
> → `OPS_JOURNAL.local.md §14.4`. Коммиты `eff3f36`, `88f8773`.
> **Сессия №13 (2026-06-04, ремедиация + архитектурные решения):** зафиксированы 4 решения: Ключница в РФ
> (152-ФЗ локализация ✅ закрыт), Redis для rate-limit store (решение принято), `lena*_`БД не переименовывать,
> DKIM`направа.рф`не трогать (driving-school отправляет через`letar.best`). **Этап 2 п.3 ✅ ПОЛНОСТЬЮ** —
> ремедиация застрявших: aboi 0/2, dsperevod 0/3, auth-hub bulk-верификация 12→0 (OAuth VK-аккаунты апреля).
> **Этап 2 — ПОЛНОСТЬЮ закрыт.**
> **Сессия №14 (2026-06-04, Этап 0.3 — дочистить бэкапы):** ✅ Nginx NPM offsite подтверждён —
> бэкапы создавались на обоих серверах до мая; обнаружен баг `WORKSPACE_PATH=/home/deploy/lena`внутри контейнера (должен быть`/home/deploy/letar`) → nginx backup не создавался с 18 мая (s2)
> и 27 мая (s1, контейнер упал exit 127). Фикс: хардкод в `docker-compose.production.yml`;
> коммит `27960b3`, деплой запрошен у BlackCove. ✅ Ротация nginx бэкапов реализована
> (MAX_AUTO_BACKUPS=14); старые бэкапы почищены вручную (27 удалено на s2, 35 на s1). ✅ IgnoreList
> обновлён на s1 + s2: добавлены `.env.docker`/`.env.local`/`.env`→ секреты не идут в Resilio.
> ✅ Dry-run восстановления: nginx архив (737 файлов, sqlite+certs) и Maddy архив (DKIM 8 доменов)
> валидны. ✅ Стратегия локальных credentials задокументирована в`backup-architecture.md`(KeePassXC для секретов, git для кода, Resilio для uploads+backups). Stub-файлы созданы на s1
> для s2-only apps. Деплой выполнен BlackCove (сессия №14 продолжение): s2 — nginx backup 8 KB ✅;
> s1 — remote lena→letar исправлен, контейнер поднят, nginx backup 7.9 MB ✅.
> **Этап 0.3 — ПОЛНОСТЬЮ закрыт.**
> **Сессия №15 (2026-06-04, Этап 4 — шаги 1–2):** разведка premium-rosstil (schema.zmodel, auth.ts,
> register-form, signin-form, auth-client). ✅ **Шаг 1:** `register-form.tsx`— заменить`fetch('/api/auth/register')`на`authClient.signUp.email({ name, email, password })`;
> удалён `/api/auth/register/route.ts`. ✅ **Шаг 2:** `signin-form.tsx`resend —`fetch('/api/auth/resend-verification')`→`authClient.sendVerificationEmail()`; удалён
> `/api/auth/resend-verification/route.ts`. Коммит в submodule `4d389d8`+ bump SHA`20af8d5`.
> **Сессия №16 (2026-06-04, Этап 4 — шаги 3–6):** ✅ **Шаг 3:** `forgot-password-form.tsx`→`authClient.requestPasswordReset()`(в BA 1.6.11 метод`requestPasswordReset`, не `forgetPassword`);
> `reset-password-form.tsx`→`authClient.resetPassword()`;
> удалены кастомные API routes `/request-reset`, `/reset-password`. ✅ **Шаг 4:** удалены
> `lib/tokens.ts`, `lib/rate-limit.ts` и все потребители (`verify-email/route.ts`,
> `cleanup-rate-limits/route.ts`). ✅ **Шаг 5:** schema.zmodel — убрано поле `type`из`Verification`,
> дропнута `LoginAttempt`; migration `20260604155648_remove_custom_auth_fields`создана и применена.
> ✅ **Шаг 6:** `verify-email/page.tsx`переписан на`authClient.verifyEmail()`+ resend UI при
> ошибке (ResendVerificationButton + поле email по эталону dsperevod). bump 0.73.4→0.74.0;
> коммит`51a465c`+ bump SHA`230a07b`. **Этап 4 — ПОЛНОСТЬЮ завершён.**
> **Сессия №17 (2026-06-04, Этап 5 ✅ ПОЛНОСТЬЮ):** богатый pin-auth флоу в premium-rosstil:
> хук `sendVerificationEmail`генерирует PIN + отправляет письмо через`@letar/email`с кодом и ссылкой;`lib/pin-auth-adapters.ts`—`PinValidatorAdapter`(namespace через identifier, без поля type);
> SSE endpoint`/api/auth/verification-stream/[email]`— cross-tab синхронизация;
> server actions:`verify-pin`, `resend-verification-pin`(через BA API),`verify-login`(HMAC-signed cookie);
> страница`/auth/verify-pin`с Chakra`PinInput`+`usePinVerification`hook;
> register-form → редирект на verify-pin; signin EMAIL_NOT_VERIFIED → resend + редирект;
> rate limit`/send-verification-email {60,3}`; tsconfig paths + references для `@letar/pin-auth`.
> bump 0.74.0→0.75.0; коммит `7b0fcda`+ bump SHA`7b67109`. **Этап 5 — ПОЛНОСТЬЮ завершён.**
> **Сессия №18 (2026-06-05, инфра + Этап 6 ✅):** ✅ **Redis** — `infra/redis/docker-compose.production.yml`(Redis 7-alpine, 256mb LRU, kami-network);`createRedisStorage(url)`в`@letar/auth/server`;
> auth-hub + kami → `secondaryStorage`+`rateLimit.storage='secondary-storage'`; задеплоено BlackCove.
> ✅ **§13.7** — `offline_access`scope добавлен в kami + фабрику (проактивно для refresh_token).
> ✅ **0.4** — решение принято: SOPS + age (self-hosted, KeePassXC, без нового сервиса).
> ✅ **0.7 canary** —`infra/canary/canary.ts`(SMTP→Maddy, IMAP→Яндекс kaspergreen@yandex.ru);
> cron каждые 15 мин через`docker compose run`; запрос деплоя у BlackCove.
> ✅ **Этап 6** — kami/auth.ts мигрирован на `createAuth({ mode: 'hub-client' })`(241→125 строк);
> фабрика расширена:`rateLimit`, `account`, `secondaryStorage`для hub-client; деплой запрошен.
> **Сессия №19 (2026-06-05, Этап 6 + 8.5 ✅):** OIDC flow kami отлажен (5 последовательных багов: docker-compose env,
> nextCookies() порядок, cookies() в Server Component, oidc-capture redirect, name_is_missing); кнопка Войти → сразу
> Ключница;`mapProfileToUser`fallback в фабрике hub-client. Миграция данных kami выполнена:
> 4 AudioFile + ADMIN →`kami@letar.best`; `letarkami@gmail.com`и`kaspergreen@gmail.com`удалены.
> **Сессия №20 (2026-06-05, Этап 8.5 скрипты):** Созданы скрипты миграции для dashboard/archetest/animatrona-tracker:`infra/migrations/dashboard-owner-migration.ts`(role ADMIN, нет контента),`archetest-owner-migration.ts`(QuizLeaderboard+Sessions+Achievements, roles[]),`animatrona-tracker-owner-migration.ts`(Anime/UserLibrary/Distribution/PinJob/Content). Подход: raw pg без ZenStack, dry-run режим.
> ⏳ **Запустить на s2** после логина в каждое приложение через Ключницу.
> **Сессия №21 (2026-06-05, Этап 6.5 ✅ ПОЛНОСТЬЮ):** Passkeys / WebAuthn в auth-hub:
> @simplewebauthn/server@13.3.1 + @simplewebauthn/browser@13.3.0; кастомный Better Auth плагин`passkeyPlugin()`(createAuthEndpoint + getSessionFromCtx + internalAdapter.createSession + setSessionCookie);
> таблица`passkey`в schema.zmodel + миграция`20260605154458_add_passkey`;
> baseline-миграция `20260101000000_init_baseline`(resolve --applied на prod перед деплоем);
> компоненты`PasskeySignInButton`+`PasskeyRegisterButton`; кнопка на странице /sign-in.
> rpID=letar.best (дефолт), origin=BETTER_AUTH_URL. typecheck ✅ lint ✅.
> ✅ **Деплой выполнен BlackCove** (5858b0c): baseline resolved + passkey таблица создана, auth-hub Ready.
> **Сессия №22 (2026-06-05, UX-анализ passkeys + logout):** обнаружены 2 UX-проблемы по скриншотам:
> (1) Passkey кнопка падает с ошибкой при 0 passkeys, нет Conditional UI, нет управления ключами → задокументирован
> детальный план Этап 6.5.1. (2) "Выход" в kami не выходит из Ключницы → тихий ре-логин → задокументирован
> Этап 6.51 (RP-initiated logout через end_session_endpoint).
> **Сессия №23 (2026-06-06, Этап 6.51 ✅ код):** RP-Initiated Logout реализован для всех hub-client приложений через
> `createLogoutAction(auth, { oidcLogout: { endSessionUrl, clientId, postLogoutRedirectUri } })`.
> Подход: `client_id`+`post_logout_redirect_uri`без`id_token_hint`(BA oidcProvider принимает;`id_token`не нужно хранить).
> Обновлены:`kami/auth.actions.ts`+`.env`(создан);`animatrona-tracker/auth.actions.ts`+`.env`.
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
> **letar** (`_.letar.best`+ driving-school — то же ИП владельца) рег. № 100306050 от 02.06.2026;
> **aboi** (ИП Гаева) рег. № 100286690 от 16.05.2026. ✅ Решение: «трансграничная передача не осуществляется»
> корректно — 152-ФЗ касается граждан РФ, для RU-IP зарубежные провайдеры скроет гео-блокировка →
> **Этап 6.7 обязателен** для соответствия уведомлению. Не подано: premium-rosstil, imot, dsperevod
> (операторы — их владельцы). Коммиты`506f7cc`, `a43aae0`, `5db9241`.
> **Сессия №29 (2026-06-10, Этап 6.7 ✅ код):** Гео-блокировка иностранных OAuth для RU-IP.
> `auth-hub/src/lib/geo.ts`—`getCountryCode()`через`x-forwarded-for`+`geoip-lite`(MaxMind GeoLite2 локально).`sign-in/page.tsx`— фильтрует google/github/facebook/telegram для RU-IP; VK/Yandex/passkeys остаются.`oauth-buttons.tsx`— принимает проп`providers`. Fallback: нет заголовка → показывать всё (dev).
> Также: fix TS2322 в passkey-prompt-banner + passkeys-manager (`PublicKeyCredentialCreationOptionsJSON`).
> typecheck ✅ lint ✅. commit `b80de69`. Деплой запрошен BlackCove (msg #754).
> **Сессия №30 (2026-06-10, Этап 0.8 — cookie-баннер + DRY):** ✅ Общие компоненты `@letar/ui@0.3.0`:
> `CookieBanner`, `CookieSettingsButton`, `DeleteAccountZone`, `CookieConsentState`, `createConsentConfig`, `readConsentState`.
> `auth-hub`: ConsentLog в БД, POST `/api/consent`, `deleteAccountAction`, CookieBanner в layout. `aboi`: рефакторинг на shared компоненты.
> `dsperevod`: рефакторинг на shared компоненты (cookie-banner, yandex-metrika-consent, lib/consent).
> Коммиты `045bc31`(ui),`6088286`(auth-hub),`67212ae`(aboi),`791b665`(dsperevod),`1081c70`(submodule bump).
> **Сессия №31 (2026-06-10, Этап 0.8 ✅ ПОЛНОСТЬЮ):** ✅ Тираж 152-ФЗ на 4 оставшихся приложения.
> **premium-rosstil**: ConsentLog + миграция,`/api/consent`, YandexMetrikaConsent (consent-aware обёртка),
> CookieBanner в layout, deleteAccountAction → DeleteAccountZone в settings/page.tsx.
> **imot**: ConsentLog + миграция (reset drift: scope/Verification), `/api/consent`, deleteAccountAction,
> DeleteAccountZone в my-profile/page.tsx, CookieBanner в layout.
> **driving-school**: ConsentLog + миграция (reset drift: StudyGroup/TheoryTopic), `/api/consent`,
> deleteAccountAction (soft-delete через deletedAt), DeleteAccountSection в settings/page.tsx, CookieBanner.
> **grandslamcup**: ConsentLog + миграция, `/api/consent`, deleteAccountAction, DeleteAccountSection
> в profile/page.tsx, CookieBanner в layout. Все субмодули запушены, SHA обновлены в letar.
> **Сессия №32 (2026-06-11, Этап 7 ✅ ПОЛНОСТЬЮ):** `driving-school/auth.ts`мигрирован на`createAuth({ mode: 'standalone' })`(~607→~330 строк);`@letar/auth`расширен полями`socialProviders`, `databaseHooks`, `password`(v0.5.0→v0.6.0); pin-auth адаптеры обновлены на namespace-подход без поля`type` (как в premium-rosstil Этап 5); SSE endpoint обновлён (`autologin:email`namespace); добавлен`magicLink` плагин BA + UI на /sign-in (`MagicLinkForm`+ server action).`magicLinkClient()`добавлен в`auth-client.ts`.
> **Сессия №33 (2026-06-11, Этап 8 ✅ ПОЛНОСТЬЮ):** `auth-hub/auth.ts`мигрирован на`createAuth({ mode: 'hub-provider' })`(~401→~205 строк без хелперов);`@letar/auth`расширен:`buildHubProviderAuth`(oidcProvider авто-включён, rate-limit с OIDC-правилами, secondaryStorage, account-linking),`OidcProviderConfig`в types; 8 новых тестов hub-provider (nextCookies последний, oidcProvider с defaults и кастомом, rate-limit, accountLinking);`@letar/auth`v0.6.0→v0.7.0;`auth-hub`v0.4.0→v0.5.0.
> **Сессия №34 (2026-06-11, OIDC Pending Auth Cookie ✅):** Новый route`api/auth/oauth2/authorize/route.ts`перехватывает BA authorize,
> сохраняет полные OIDC-параметры в`oidc*pending`cookie до BA-обработки (клонирует Response с Set-Cookie).`consent/page.tsx`читает cookie → передаёт`oidcParams`в`AccountChooser`. `AccountChooser`при смене аккаунта
> редиректит`/sign-in?...полные params...`вместо усечённых consent params. commit`1fc3ab1`. typecheck ✅ lint ✅.
> Деплой запросить у BlackCove.
> **Сессия №35 (2026-06-11, Этап 0.4 ✅ ПОЛНОСТЬЮ):** age v1.3.1 + sops v3.12.2 установлены через winget;
> age-ключ сгенерирован (публичный `age1v0vhymhfxupa66zvrmqxv2yz4q0d8xxazh2m4k87tl0wk3ccmu4sftywza`), приватный в KeePassXC;
> `.sops.yaml`настроен в корне репо;`auth-hub/.env.docker`зашифрован →`.env.docker.enc`добавлен в git;`.gitignore` расширен (`!**/.env.docker.enc`); `deploy-affected.sh`— функция`decrypt_sops_env()`авто-расшифровывает
> при наличии`SOPS_AGE_KEY_FILE`; документация `secret-manager.md`. Commit `5365647`.
> ✅ Тираж завершён (сессия №35 продолжение): 22 приложения зашифрованы (16 публичных + 5 submodules + auth-hub);
> все `.env.docker.enc`в git; root + 5 submodule запушены. Commit`eb21137`.
> ✅ age-ключ установлен на s2 (`/home/deploy/.age/letar-key.txt`chmod 600 +`SOPS_AGE_KEY_FILE`в`.bashrc`);
> деплой auth-hub `c0ed40c` через SOPS прошёл успешно — подтверждено BlackCove (agent-mail msg #762). **Этап 0.4 — ПОЛНОСТЬЮ закрыт.\*\*
> **Сессия №36 (2026-06-11, статус + подтверждение инфры):** `/repo` — сводный отчёт плана; уточнено что
> age-ключ на s2 установлен BlackCove в сессии деплоя (msg #762); все деплои сессий №32–35 подтверждены.
> **Сессия №37 (2026-06-11, Этап 8.5 ✅ ПОЛНОСТЬЮ + animatrona-tracker auth UX + UserMenu):**
> ✅ **Этап 8.5 — ПОЛНОСТЬЮ:** owner-миграция animatrona-tracker выполнена BlackCove (1155 Anime, 144 UserLibraryItem,
> 2901 Distribution, 1144 PinJob, 1226 ModerationLog → `kami@letar.best`; старые аккаунты удалены).
> ✅ **Rate limit fix** — глобальный `rateLimit.max` 10→100 в animatrona-tracker/auth-config.ts (`useSession()` исчерпывал
> лимит при каждом рендере). commit `5214f0d`.
> ✅ **Auth UX** — кнопка «Войти» в хедере теперь сразу редиректит на Ключницу (OIDC); `returnTo` фиксирован
> `/browse`→`/` (страница не существует). commit `9fe6f7c`.
> ✅ **`UserMenu` в `@letar/ui`** — универсальный компонент меню пользователя для всего монорепо (кнопка «Войти»,
> dropdown с профилем, Ключницей, доп. пунктами и Выйти); применён в animatrona-tracker вместо разрозненных элементов.
> Экспорт из `libs/ui/src/index.ts`; dist пересобран (`tsc --build libs/ui/tsconfig.lib.json`). commit `ef8fdf0`.
> **Сессия №38 (2026-06-11, Этап 1.5 DoD + Этап 6.7 деплой + Этап 6.8 UserMenu rollout):**
> ✅ **Этап 1.5 DoD** — `libs/auth/README.md` обновлён до v0.7.0: добавлены hub-client (kami-паттерн с Redis), hub-provider (auth-hub), standalone+org (driving-school), `createLogoutAction` с oidcLogout, `createRedisStorage`. commit `2968059`.
> ✅ **Этап 6.7 деплой** — auth-hub `b80de69` задеплоен BlackCove (geo-blocking иностранных OAuth для RU-IP).
> ✅ **sync-env animatrona-tracker** — файлы идентичны, `.env.docker.enc` валиден.
> ✅ **Этап 6.8 UserMenu rollout** — kami, grandslamcup, archetest, time переведены на `UserMenu` из `@letar/ui`; добавлены tsconfig references. dashboard-agent пропущен (backend без UI). commit `badcd95`.
> **Сессия №39 (2026-06-12, Этап 6.8 standalone ✅ ПОЛНОСТЬЮ):** `@letar/ui UserMenu`: добавлен `showAuthHub` (default true) — скрывает «Аккаунт в Ключнице» для standalone-приложений.
> **aboi**: `AuthButton` переведён на `UserMenu` из `@letar/ui` (Client Component, `useSession()`, `showAuthHub=false`, `isAdmin` через userExt cast). `Suspense` убран вокруг AuthButton.
> **dsperevod**: N/A — нет auth UI в хедере (landing-сайт с кнопкой «Заказать перевод»).
> **premium-rosstil**: N/A — уже есть собственный `UserMenuClient` (Server wrapper + i18n Links + `colorPalette="fg"`).
> typecheck ✅ lint ✅. commits `c72e05c` (aboi), `d6b2edb` (letar).
> **Сессия №40 (2026-06-12, план):** в roadmap добавлен **Этап 6.9** — подвал «Сделано в studio.letar.best»
> со ссылкой (UTM) на всех публичных сайтах монорепо; общий компонент `StudioCredit` в `@letar/ui`;
> для коммерческих submodules — предварительное согласование с владельцами.
> **Сессия №42 (2026-06-15, план):** в roadmap добавлен **Этап 6.10** — версия сборки в подвале на всех сайтах;
> общий компонент `BuildVersion` в `@letar/ui` читает `version` из `package.json` (билд-тайм проброс через
> `NEXT_PUBLIC_APP_VERSION`/серверный импорт); рядом со `StudioCredit`, тираж одной правкой футера.
> **Сессия №43 (2026-06-15, Этап 8 ✅ ПОЛНОСТЬЮ):** Admin UI OAuth-клиентов + at-rest шифрование.
> Tier 1: `/admin/clients` CRUD (список, создание через RisksConsent → ClientForm, детали, редактирование);
> `SecretBanner` (plaintext один раз через `?secret=`); `RotateSecretButton`, `DeleteClientButton`, `ToggleClientButton`.
> Tier 2: `libs/auth/server/crypto.ts` (AES-256-GCM секреты + AES-256-CBC детерминированные токены);
> `social-loader.ts` (OAuth-провайдеры из БД); `createAuthAsync({ social: { source: 'db' } })`;
> `auth-hub/lib/db.ts` — encryption proxy для oauthApplication/oauthAccessToken/account;
> `scripts/encrypt-client-secrets.ts` — backfill скрипт; обратная совместимость с plaintext.
> `libs/auth/tsconfig.lib.json` — исключение spec-файлов из lib-сборки.
> typecheck ✅ lint ✅ tests ✅. commit `4e70c76`. **⏳ Следующее:** деплой + backfill скрипт на проде.
> **Сессия №44 (2026-06-18, Этап 9 — деплой Этапа 8 ✅ ПОЛНОСТЬЮ):** ✅ `AUTH_ENCRYPTION_KEY` в `.env.docker.enc` (commit `2ed6f12`) + деплой auth-hub BlackCove + `/sync-env`. Ключница была недоступна после деплоя (500 — ключ не попал в контейнер без `/sync-env`), исправлено срочным запросом BlackCove. auth.letar.best восстановлен. Ключ сохранён в KeePassXC. ✅ Backfill `encrypt-client-secrets.ts --execute` выполнен BlackCove (msg #918). ✅ `kami@letar.best` повышен до ADMIN (msg #919). ✅ Admin UI `/admin/clients` верифицирован: 7 клиентов активны. **Этап 9 — ПОЛНОСТЬЮ закрыт.**
> **Сессия №46 (2026-06-26, Этап 0.6 — lena-хвосты + owner-migrations + OIDC offline_access + MobileAuthSection):**
> ✅ Owner-migrations (dashboard/archetest/animatrona-tracker) — dry-run: уже выполнены, kami@letar.best — ADMIN.
> ✅ OIDC `offline_access` scope добавлен в 4 приложения (dashboard, archetest, grandslamcup, studio) — refresh_token теперь сохраняется в `account`.
> ✅ Dockerfile-комментарии `C:\web\lena` → `C:\web\letar` в imot/driving-school/premium-rosstil (submodule коммиты).
> ✅ `lena-form-sync-queue` → `letar-form-sync-queue` с однократной миграцией. `@letar/forms` 1.4.0→1.4.1 (commit `f7bea2e`).
> ✅ §17 Kamal (zero-downtime деплой) — план добавлен в PLAN.md (commit `3fbfb9d`).
> ✅ Этап 6.8 UserMenu — svoichuzhie добавлен (header.tsx); `MobileAuthSection` создан в `@letar/ui` и тираж на 4 приложения (animatrona-tracker, grandslamcup, archetest, svoichuzhie). commit `f94d28c`, `e2b1701`, `6f324fe`.
> **➡️ Следующий старт:** Этап 8 — Соц-секреты per-владелец (§8) или §17 Kamal pilot на grandslamcup.
>
> **Сессия №47 (2026-07-03, вывод из эксплуатации premium-rosstil + imot):** владельцы обоих приложений больше
> не клиенты letar. ✅ Полный бэкап передан заказчику: git-история (bundle) обоих submodules + их e2e, реальные
> дампы БД и uploads с живого сервера (92/32 таблицы, 272 МБ фото у premium-rosstil; imot без загруженных
> файлов — подтверждено, не баг). Попутно найдено: обе площадки все время работали на `s1.letar.best`
> (не отдельный сервер клиента, как казалось сначала) — Resilio Sync на s1 был неделями в состоянии `paused`,
> BlackCove перезапустил сервис. ✅ Снесены протухшие артефакты недоделанной миграции на s2 (пустые
> контейнеры/БД, миграция никогда не была завершена). ✅ Submodules (`premium-rosstil`, `premium-rosstil-e2e`,
> `imot`, `imot-e2e`) убраны из `.gitmodules`/индекса/директорий; `deploy-affected.sh` (`S2_APPS`), `.mcp.json`
> (`postgres-premium-rosstil`), `.claude/rules/deployment.md`, `infra/nginx-proxy-manager/README.md` (домены,
> сети) почищены. **⚠️ `infra/nginx-proxy-manager/docker-compose.yml` НЕ тронут** — NPM на s1 всё ещё физически
> проксирует живой сайт клиента через `imot-network`/`kami-network`; убирать сеть из compose нельзя, иначе
> следующий redeploy NPM молча оборвёт клиенту трафик (сайт продолжает работать, клиент сам разберётся дальше).
> Удалены `.claude/commands/premium-rosstil.md`, `imot.md`, `.claude/rules/premium-rosstil.md`, `imot.md`.
> Матрица §3.1 и таблица 0.8 обновлены. Не тронуто: `apps/dashboard` (cron-мониторинг imot-эндпоинтов),
> `apps/umami` (трекинг сайтов) — точечный follow-up для их владельцев.
>
> **Сессия №45 (2026-06-19, §15 E2E-ранер — ввод в строй):** ✅ **E2E-ранер s3 полностью операционен.**
> Postgres (5499) + Redis (6380) поднят в Docker на s3; лог заполняется через systemd user timer (02:00, `Persistent=true`).
> ✅ **driving-school-e2e — ключевые фиксы:** (1) `skipInstall: true` в ВСЕХ target'ах `project.json` — решает
> корневую причину «nx e2e не запускает тесты»: executor `@nx/playwright:playwright` прерывался
> при webkit-предупреждении от `playwright install` и выходил 0 без прогона тестов;
> (2) локаторы «Войти» — `page.locator('form').getByRole('button', { name: 'Войти', exact: true })`
> во всех трёх местах: `global-setup.ts`, `01-auth.spec.ts` (3 вхождения), `form.helpers.ts`.
> ✅ **Результат прогона shard-core через `nx e2e:core driving-school-e2e`:** 36 passed, 5 skipped, 10 failed.
> Failures: 3 auth-navigation (E2E-1.1.104/105/107 — реальные баги UI) + 7 instructor profile (cookie consent
> banner перекрывает контент; student profile работает — требует отдельного дебага).
> ✅ **animatrona pinner4:** добавлены константы и конфиг для pinner4 (s3) в `kubo-config.ts`,
> `peer-sync-types.ts`, `peer-sync-service.ts` — s3 вошёл в Bootstrap и Peering.Peers Kubo.
> ⏳ **Осталось в §15:** instructor profile failures; Telegram BOT_TOKEN/CHAT_ID (нотификации); `nx affected --target=e2e`.
> **➡️ Следующий старт:** следующий этап roadmap (Этап 10 или по приоритету).
>
> **Сессия №49 (2026-07-09, план — §18 🆕 Deploy MCP + staging-пайплайн):** добавлен **§18** — полный план
> в 4 сессии (A–D): харденинг `deploy-affected.sh` (миграции fail=abort, pg_dump перед миграцией, sha-теги
> образов → ручной rollback), `libs/infra-config` (единый маппинг app→server), `libs/deploy-mcp` (MCP-обёртка
> над REST API dashboard-agent: deploy_app/deploy_status/…, SSH-туннель вместо публичного порта 3100),
> dashboard-agent на s3 → **staging-gated пайплайн** (staging → e2e → warn-gate → production, реализует Этап A
> §15.3.1; cross-server gap решён проверкой в deploy-mcp). Пилот — grandslamcup (staging-комплект уже есть).
> Уже сделано в коде (не закоммичено): deploy.ts (deployId+ring-buffer+sinceLine+staging+spawn без shell),
> server-config.ts (s1 убран), cron.ts (мёртвые s1-задачи удалены). Staging-домены: `<app>.s3.letar.best`.
> §17 (Kamal) не отменён — выбор «deploy-engine TS + docker-rollout vs Kamal» отложен до Фазы 3 (§18.6).
> **➡️ Следующий старт:** §18 Сессия A (харденинг deploy-affected.sh).
>
> **Сессия №50 (2026-07-09, деплой-очередь + найден блокер submodule-pointer):** BlackCove разгребал накопившуюся
> deploy-очередь (10+ запросов с 3 июля, часть авторов уже retired). Приоритет — archetest v0.23.0 (id 275):
> деплой упал на этапе `git pull` submodules — **два битых pointer'а** в `letar/main`: `apps/driving-school`
> (bump `a84013b3b`) ссылается на `11cd91c6`, `apps/aboi` (bump `84dc5080c`) — на `f550da36`; оба SHA
> отсутствуют в приватных submodule-репо (не запушены или потеряны при force-push/rebase). Это блокирует
> **любой** деплой на s2, не только archetest — `deploy-affected.sh` тянет все submodules перед фильтрацией по
> `--app`. Авторы bump-коммитов (SapphireGlacier, AzurePeak) — retired, писать некому. Фикс найден, но не
> применён (ждёт коммита): pointer'ы нужно перевести на актуальный `origin/main` submodule-репо
> (`driving-school` → `e5664f6`, `aboi` → `99c2cea` — оба уже содержат тот же логический фикс под другим SHA).
> Добавлено в §18 «Проблема» п.4 — валидация submodule-pointer'ов перед bump-коммитом. **➡️ Следующий старт:**
> закоммитить исправленные pointer'ы в `letar/main`, перезапустить деплой archetest → обработать остаток
> очереди (grandslamcup hotfix 3.37.2, container_name batch — umami/auth-hub/animatrona-tracker/mandala/
> aboi/aprel8008, dsperevod+dashboard+dashboard-agent, pravda, svoichuzhie v0.10.16; studio DATABASE_URL и
> grandslamcup uploads permissions — инфра-фиксы руками на сервере, не через deploy-affected.sh;
> premium-rosstil/imot teardown — вероятно уже неактуально, приложения выведены из эксплуатации 2026-07-05).
>
> **Сессия №48 (2026-07-06, план — §15.3.1 🆕):** добавлен раздел **§15.3.1 «Prod-снепшот + анонимизация —
> pre-deploy gate»**: ночной pipeline `pg_dump` прод-БД → детерминированная анонимизация PII (152-ФЗ,
> `personal-data.md`) → restore в `e2e_<app>` на s3 → прогон e2e на срезе, близком к прод-данным, вместо
> пустой схемы. `deploy-affected.sh` получает `check_e2e_gate()` (сначала warn-only, потом hard gate) —
> деплой блокируется, если последний e2e упал. Отдельно — обратный граф зависимостей от `libs/**`
> (`blast-radius.ts`): правка общей либы гоняет e2e у всех приложений-потребителей, не только у изменённого.
> Только план, реализация не начата. **➡️ Следующий старт:** пилот на driving-school (DoD 15.3.1).
> **Уточнение (2026-07-06, тот же день):** пилот переназначен на **grandslamcup** — свой пет-проект (не
> коммерческий клиент, ниже юридический риск чем driving-school с документами учеников автошколы), уже есть
> ConsentLog + auth-флоу + e2e с реальными прод-данными участников/матчей, схема проще driving-school → быстрее
> провалидировать `anonymize.sql` и весь цикл snapshot→restore→e2e перед тиражом на более сложные приложения.
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
> вынесены из `auth-hub/src/lib/auth.ts` в `process.env.OIDC*\*\_SECRET`(fail-fast хелпер); значения добавлены в`.env.local`/`.env.docker`(не коммитятся). ✅ **Этап 0.5 публичная часть** — тег`owner:letar` в 60 project.json
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
driving-school dsperevod` зелёный. ⏳ Заведена отдельная задача на предсуществующий `typecheck:tsgo` TS2883 в
>   `dsperevod/src/lib/auth-client.ts` (непортируемый тип better-auth — вне scope lint-сессии).
>   **Сессия реализации №5 (2026-05-31, submodules aboi + aboi-e2e):** ✅ **Этап 2 — эталон aboi** (resend
>   email-верификации): блок resend на `/sign-in` (EMAIL*NOT_VERIFIED) и форма на `/verify-email`; захват
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
>   из `OIDC*\*\_SECRET`env vars через raw ZenStack ORM (обходит`@@deny('all', true)`); nx target `db:seed`; обновлена
>   `/admin/clients`(redirect URLs, toggle disabled, пустой стейт с инструкцией);`docker-compose.dev.yml`для локальной БД;
>   seed выполнен и проверен (7/7 ✓). Особенность BA v1.6.11:`skipConsent`не читается из БД → studio покажет consent 1 раз.
>   ✅ Деплой на s2 выполнен: seed 7/7 + перезапуск auth-hub (BlackCove).
>   **Сессия реализации №8 (2026-06-04, инфра — Этап 0.1 ✅ ПОЛНОСТЬЮ):** ротация 6 утёкших OIDC-секретов:
>   сгенерированы новые значения; обновлены`.env.docker`auth-hub + 6 клиентов (kami, dashboard, archetest, time,
>   grandslamcup, animatrona-tracker) локально и на s2; добавлен`OIDC_STUDIO_SECRET`(studio-prod, новый клиент);
>   повторный seed на s2 — upsert 7/7; рестарт всех контейнеров в порядке (auth-hub → клиенты). Старые литералы
>   из публичной git-истории отозваны. Риск 🔴 «секреты в публичном репо» закрыт.
>   **Сессия реализации №9 (2026-06-04, Этап 1.5 ⏳):** фабрика`createAuth(profile)`в`@letar/auth/server`:
>   типы `AuthProfile`(3 режима), generic build-функции, 16 Vitest тестов; bump 0.3.0→0.4.0. Эталоны:
>   dsperevod (standalone, 90→35 строк) + time (hub-client, 84→20 строк, без DB). Ограничение Better Auth:`additionalFields`не выводятся через фабрику — 3 cast-сайта dsperevod исправлены через`as unknown as`.
>   Осталось по DoD: README + E2E behavior-parity.
>   **Сессия реализации №11 (2026-06-04, Этап 3 ✅ ПОЛНОСТЬЮ):** admin/users с VerifyButton во всех 5 приложениях:
>   aboi (новая страница + AdminNav), kami (новая страница + AdminSidebar), auth-hub (VerifyButton в существующую),
>   dsperevod (verifyUserAction + logAudit + VerifyButton), premium-rosstil (verifyUserAction + VerifyButton + колонка).
>   Коммиты в 3 submodule + bump SHA + корневой репо.
>   **Сессия реализации №10 (2026-06-04, Этап 1.5 ✅ DoD):** README `@letar/auth`полностью переписан —
>   добавлен раздел`createAuth()`с контрактом`AuthProfile`, всеми тремя режимами, примерами dsperevod/time,
>   ограничением `additionalFields`; обновлена дата и версия (0.4.0). Создан `docker-compose.dev.yml` для dsperevod
>   (postgres:17, порт 5442). E2E behavior-parity: 3/3 passed chromium — поведение standalone через фабрику
>   идентично эталону сессии №6. **Этап 1.5 закрыт полностью.**
