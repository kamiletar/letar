# Changelog

Формат основан на [Keep a Changelog](https://keepachangelog.com/ru/1.0.0/).

## [Unreleased]

## [0.7.2] - 2026-07-30

### Fixed

- **Telegram API через tg-proxy (обход блокировки s1/s2):** `sendBotMessage()` в
  `src/lib/telegram/plugin.ts` хардкодил `https://api.telegram.org`, заблокированный провайдером ДЦ
  на s1/s2 — уведомления о привязке/отвязке Telegram-аккаунта зависали. Переведён на
  `TELEGRAM_API_ROOT` с дефолтом `https://tg-proxy.letar.best`.

## [0.6.5] - 2026-07-16

### Fixed

- **GET-утечка пароля в URL до hydration:** `method="post"` на `sign-in`/`sign-up`/
  `change-password` формах. Найдено на `/sign-in` (v0.6.4), аудит расширил скоуп на весь
  монорепо (aboi/dsperevod/svoichuzhie) и на саму библиотеку `@letar/forms` (оба корневых
  `<form>`-компонента) — риску были подвержены все приложения на этой библиотеке.

## [0.6.4] - 2026-07-16

### Added

- **Этап 8.5 корневого PLAN.md — вход по любому linked-email:** `resolveLoginEmail()`
  (`src/lib/resolve-login-email.ts`) резолвит подтверждённый дополнительный адрес
  (`UserEmail.verified`) в основной `User.email` ДО вызова Better Auth — core-резолв sign-in
  не тронут (от него зависят ~10 downstream-приложений через OIDC). Подключён в `loginUser`
  (email+password) и `sendMagicLinkAction`. Совпадение с чьим-то основным адресом всегда
  приоритетнее linked-записи (защита от «затенения» чужого аккаунта устаревшей привязкой).
  Неподтверждённые привязки не резолвятся (иначе перехват входа по чужому непроверенному адресу).

### Fixed

- **Дубль-аккаунт при входе по linked-email:** до этого изменения ввод linked-адреса + пароля
  уводил `loginUser` в auto-sign-up (уникальность `UserEmail.email` не пересекается с
  `User.email`) и молча создавал второй аккаунт; magic link с `disableSignUp: false` — та же
  дыра. Теперь при `resolved=true` и неверном пароле возвращается «Неверный пароль» без
  регистрации, magic link резолвится до Better Auth (письмо уходит на основной адрес владельца).
- **Гонка «email стал основным за время жизни токена»:** `verifyAddedEmail` перепроверяет
  занятость адреса таблицей `User` на момент подтверждения (токен живёт 24ч) — иначе
  подтверждённая привязка конфликтовала бы с обычной регистрацией того же адреса.

## [0.6.2] - 2026-07-16

### Added

- **Этап 8.5 корневого PLAN.md — self-service несколько email на аккаунт:** `/profile/emails/`
  (модель `UserEmail`) — добавление дополнительного адреса с подтверждением по ссылке (свой
  токен, 24ч TTL, не пересекается с core Better Auth `Verification`), удаление, назначение
  подтверждённого адреса основным. **Не покрыто:** вход по любому linked-email (требует
  перехвата резолва sign-in — отдельная задача) и merge двух уже существующих разных
  аккаунтов (остаётся ручным скриптом владельца, необратимо).

### Fixed (по пути, при живой проверке фичи)

- `revalidatePath` вызывался во время рендера `/profile/emails/verify` (не через
  форму/transition) — Next.js это запрещает, страница подтверждения падала с 500 после
  успешного (уже применённого) обновления БД.
- Смена основного email напрямую в БД не инвалидировала `cookieCache` Better Auth (до 5 минут
  в hub-provider профиле) — активная сессия и OIDC `id_token` для ~10 downstream-приложений
  Ключницы временно отдавали бы устаревший email. Исправлено принудительным `signOut` сразу
  после смены — пользователь перелогинивается с новым основным адресом.

## [0.4.0] - 2026-05-30

### Added

- **Повторная отправка письма верификации (resend) на `/sign-in`** (Этап 2 PLAN.md — «тупик без resend»). Если при входе/авторегистрации email не верифицирован (`verifyEmailSent`), форма теперь показывает кнопку `<ResendVerificationButton>` из `@letar/auth/client` со встроенным cooldown (60с). Cooldown стартует только при успешной отправке; при ошибке SMTP кнопка остаётся активной и показывается нейтральное сообщение. Раньше пользователь видел только текст и застревал, если письмо не дошло.
- **Захват `SendEmailResult` в `emailVerification.sendVerificationEmail`** (`lib/auth.ts`): при `success === false` вызывается `reportEmailFailure({ type: 'verification', … })` из `@letar/email` — провалы SMTP больше не игнорируются молча (первопричина PLAN.md), видны в `docker logs`.
- **Rate-limit на resend** — `customRules['/send-verification-email'] = { window: 60, max: 5 }` (защита от email-флуда, §13.3). Точечный per-email лимит — TODO (нужен кастомный ключ).

### Changed

- `login.action.ts`: ветка `EMAIL_NOT_VERIFIED` при входе существующего неверифицированного пользователя теперь возвращает `verifyEmailSent: true` — форма показывает кнопку resend (не только текст).

## [0.3.1] - 2026-05-04

### Fixed

- **Magic Link с OIDC параметрами больше не падает с `INVALID_CALLBACK_URL`**. После клика по ссылке `/api/auth/magic-link/verify?...&callbackURL=/api/auth/oauth2/authorize?...&redirect_uri=https%3A%2F%2F...` Better Auth (1.6.3) делал `decodeURIComponent(callbackURL)` и валидировал относительный путь через regex `/^\/(?!\/|\\|%2f|%5c)[\w\-.\+/@]*(?:\?[\w\-.\+/=&%@]*)?$/` — этот regex для query string не разрешает двоеточие `:`, а после декодирования `redirect_uri` содержит сырое `:` (`https://...`). `usePostSignInCallback` теперь возвращает АБСОЛЮТНЫЙ URL (`window.location.origin + /api/auth/oauth2/authorize?...`) — он валидируется не regex'ом, а через `trustedOrigins` (`baseURL` уже там по умолчанию). Это касается не только magic link, но и OAuth (Google/Yandex/etc) и email/password входа в OIDC контексте.

## [0.3.0] - 2026-05-04

### Changed

- **OIDC SSO теперь показывает экран выбора аккаунта** (как у Google) для всех trusted clients (archetest, time, grandslamcup, kami, animatrona-tracker, dashboard). Раньше при наличии активной сессии Better Auth `oidcProvider` со `skipConsent: true` мгновенно редиректил обратно в client app с токеном — пользователь не мог сменить аккаунт без ручного выхода. Теперь у всех trusted clients `skipConsent: false`, и при существующей сессии открывается `/oauth/consent` с тремя действиями: «Продолжить как X» (POST `/api/auth/oauth2/consent` accept=true → токен → возврат), «Войти под другим аккаунтом» (`signOut` + redirect на `/sign-in?<OIDC params>` — после нового логина `usePostSignInCallback` продолжает OIDC flow), «Отмена» (accept=false → возврат с `error=access_denied`). Никаких изменений в client apps не требуется — стандартный OIDC consent flow.

### Refactored

- `apps/auth-hub/src/app/oauth/consent/page.tsx` — server component получает session + название клиентского приложения из локального словаря `CLIENT_NAMES` (имена дублируются из `trustedClients` в `lib/auth.ts` без секретов).
- Создан `apps/auth-hub/src/app/oauth/consent/_components/account-chooser.tsx` (client component с UI) — заменил старый `consent-form.tsx` (показ запрашиваемых scopes больше не нужен, т.к. все клиенты — внутренние и доверенные).

## [0.2.2] - 2026-04-10

### Fixed

- Регистрация нового пользователя через `LoginForm` (email + пароль) больше не зависает на крутилке. В проде стоит `requireEmailVerification: true`, поэтому `signUpEmail` создаёт юзера и отправляет письмо подтверждения, но **не создаёт сессию**. Старый код в `login.action.ts` всё равно возвращал `success: true` с `redirectTo` на `/api/auth/oauth2/authorize?...`, фронт делал `router.push`, OIDC endpoint видел отсутствие сессии и через 302 кидал обратно на `/sign-in?<query>` — но это soft navigation, `LoginForm` не ремонтился, React-стейт `loading=true` оставался → крутилка вечно. Теперь action проверяет наличие `token` в ответе `signUpEmail` и при его отсутствии возвращает `{ success: false, verifyEmailSent: true, error }` с понятным сообщением «Аккаунт создан. Мы отправили ссылку для подтверждения на вашу почту». `LoginForm` показывает это сообщение в info-цвете (не как ошибку) и сбрасывает `loading`.

## [0.2.1] - 2026-04-10

### Fixed

- После OAuth (Google/Яндекс/VK/GitHub) и email/password входа пользователь теперь корректно возвращается в клиентское приложение вместо того чтобы застрять на главной ключницы. Починка OIDC authorization_code flow: компоненты на `/sign-in` (`AuthOAuthButtons`, `LoginForm`, `MagicLinkForm`) через новый хук `usePostSignInCallback` определяют, что страница открыта как часть OIDC flow (`client_id` + `redirect_uri` + `response_type` в query), и подставляют `callbackURL = /api/auth/oauth2/authorize?<query>` — после успешного логина Better Auth редиректит на этот внутренний URL, OIDC authorize endpoint находит свежую сессию и продолжает выдачу кода для клиентского приложения.

## [0.2.0] - 2026-04-09

### Added

- Страница настроек профиля `/profile/settings` — редактирование имени
  - Server action с Zod v4 валидацией
  - Ссылка на настройки со страницы профиля
- Управление ролями пользователей в админ-панели
  - Кнопка переключения ADMIN/USER для каждого пользователя
  - Защита: нельзя менять свои роли, роль USER всегда сохраняется
  - Колонка верификации email в таблице пользователей

## [0.1.1] - 2026-04-09

### Fixed

- Настроены правильные параметры для страницы связанных аккаунтов:
  - `linkCallbackUrl` → `/profile/connected-accounts` (было дефолтное `/settings/connected-accounts`)
  - `providers` → `['google', 'github', 'yandex', 'vk']` (было дефолтное без github)

## [0.1.0] - 2026-04-04

### Added

- Базовая структура приложения
- Роуты авторизации (login, signup, OAuth)
- Панель администратора
- Профиль пользователя
