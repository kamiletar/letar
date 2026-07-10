# План разработки auth-hub

## Текущий статус: v0.6.1 — Фикс OIDC invalid_grant (Redis secondaryStorage) ✅

### Выполнено (v0.6.0) — сессия №43, 2026-06-15

- [x] `/admin/clients` — CRUD OAuth-приложений Ключницы (список, создание, детали, редактирование)
- [x] Двухэтапный флоу создания: `RisksConsent` (риски hub-client) → `ClientForm`
- [x] `SecretBanner` — plaintext секрет показывается один раз через `?secret=` в URL
- [x] `RotateSecretButton`, `DeleteClientButton`, `ToggleClientButton`
- [x] `libs/auth/server/crypto.ts` — AES-256-GCM (секреты) + AES-256-CBC (детерминированные токены)
- [x] `libs/auth/server/social-loader.ts` — загрузка OAuth-провайдеров из БД
- [x] `createAuthAsync({ social: { source: 'db' } })` — фабрика для standalone с DB-секретами
- [x] `src/lib/db.ts` — encryption proxy для oauthApplication/oauthAccessToken/account
- [x] `scripts/encrypt-client-secrets.ts` — backfill скрипт (dry-run по умолчанию)
- [x] `libs/auth/tsconfig.lib.json` — исключение spec-файлов из lib-сборки

### Деплой + backfill ✅ (сессия №44, 2026-06-18)

- [x] Добавить `AUTH_ENCRYPTION_KEY` (64 hex-символа) в `.env.docker.enc` auth-hub (commit `2ed6f12`)
- [x] Задеплоить auth-hub через BlackCove — выполнено, `/sync-env` + restart (auth.letar.best восстановлен)
- [x] Ключ сохранён в KeePassXC
- [x] Запустить `bun run scripts/encrypt-client-secrets.ts --execute` на s2 для шифрования существующих секретов (выполнено BlackCove, подтверждено msg #918)

---

## v0.5.0 — Миграция на `createAuth({ mode: 'hub-provider' })` ✅

### Выполнено (v0.5.0)

- [x] `auth.ts` мигрирован на `createAuth({ mode: 'hub-provider' })` (~401 → ~205 строк без хелперов)
- [x] `@letar/auth` v0.7.0: `buildHubProviderAuth`, `OidcProviderConfig`, 8 новых тестов hub-provider

---

---

## v0.4.0 — Возврат на исходный сайт при смене аккаунта

### Проблема

При смене аккаунта через «Войти под другим аккаунтом» на account chooser:

- **Email/password:** после входа пользователь корректно возвращается на исходный сайт ✅
- **Соцсети (Google/VK/Яндекс):** после входа пользователь оказывается на главной странице Ключницы (`/`), а не возвращается на сайт, с которого пришёл ❌

**Ожидаемое поведение:** при смене аккаунта любым способом входа пользователь после авторизации должен автоматически вернуться на тот сайт/URL, который инициировал OIDC flow.

---

### Диагностика: почему ломается на соцсетях

**Текущий flow при смене аккаунта:**

```
1. Пользователь на archetest.letar.best → нажимает "Войти через Ключницу"
2. Ключница: GET /api/auth/oauth2/authorize?client_id=archetest-prod&redirect_uri=...&state=...&code_challenge=...
3. Пользователь залогинен → показывает account chooser на /oauth/consent?consent_code=XYZ&client_id=...&scope=...
4. Нажимает "Войти под другим аккаунтом"
5. handleSwitchAccount: signOut() → router.push('/sign-in?consent_code=XYZ&client_id=...&scope=...&...')
6. На /sign-in: usePostSignInCallback() строит callbackUrl = http://auth.letar.best/api/auth/oauth2/authorize?...
7a. Email/password: loginUser({ callbackUrl }) → Better Auth редиректит на callbackUrl → OIDC authorize → archetest ✅
7b. Соцсети: signIn.social({ callbackURL: callbackUrl }) → Google → /api/auth/callback/google → ??? → / ❌
```

**Причина** — `callbackURL` не выживает в цепочке редиректов через внешний OAuth провайдер. Better Auth кодирует `callbackURL` в state-параметр или cookie при старте social OAuth, но URL вида `http://auth.letar.best/api/auth/oauth2/authorize?client_id=X&redirect_uri=https://...&state=Y&code_challenge=Z` содержит вложенные URL с двоеточиями, амперсандами и знаками равенства — это может вызывать двойное кодирование или не пройти валидацию в Better Auth после callback от Google/VK/Яндекс. Email/password не проходит внешний редирект, поэтому у него проблемы нет.

---

### Решение: OIDC Pending Auth Cookie

Вместо того чтобы передавать полный authorize URL через social OAuth redirect chain, хранить OIDC-параметры в серверной httpOnly-cookie (`oidc_pending`) и восстанавливать их после любого входа.

**Новый flow:**

```
1–5. Без изменений (account chooser → signOut → /sign-in с OIDC params)
6. /sign-in (Server Component): видит OIDC params в URL → устанавливает cookie
   Set-Cookie: oidc_pending=<base64(params)>; HttpOnly; SameSite=Lax; Max-Age=600; Path=/
7. Email/password или соцсети — логин проходит как обычно
8. После логина: Better Auth вызывает свой callback
9. Новый промежуточный redirect route: /auth/post-login
   - Читает cookie oidc_pending
   - Если есть → удаляет cookie, redirect → /api/auth/oauth2/authorize?<params из cookie>
   - Если нет → redirect → / (обычная главная страница)
10. OIDC authorize с активной сессией → redirect обратно на archetest ✅
```

Для email/password callbackUrl по-прежнему можно передавать напрямую (как сейчас) — это резервный вариант. Cookie добавляет второй уровень надёжности, который работает для всех методов входа.

---

### Задачи

#### 1. Установка cookie на /sign-in (Server Component)

Файл: `apps/auth-hub/src/app/(auth)/sign-in/page.tsx`

Добавить серверную логику: если в URL присутствуют OIDC параметры (`client_id`, `redirect_uri`, `response_type`), установить cookie `oidc_pending` с base64-закодированными параметрами.

Параметры cookie:

- `httpOnly: true` — недоступна из JS
- `sameSite: 'lax'` — работает после внешнего OAuth редиректа (GET)
- `maxAge: 600` — 10 минут (достаточно для прохождения OAuth)
- `path: '/'` — видна всем роутам Ключницы
- `secure: true` в production

Что хранить в cookie (JSON → base64):

```json
{
  "client_id": "archetest-prod",
  "redirect_uri": "https://archetest.letar.best/api/auth/oauth2/callback/letar-auth",
  "response_type": "code",
  "scope": "openid profile email",
  "state": "...",
  "code_challenge": "...",
  "code_challenge_method": "S256",
  "nonce": "..."
}
```

#### 2. Промежуточный route `/auth/post-login`

Файл: `apps/auth-hub/src/app/auth/post-login/route.ts` (новый)

Route handler (GET), который:

1. Читает сессию (проверяет что пользователь залогинен)
2. Читает cookie `oidc_pending`
3. Если cookie есть: удаляет cookie, redirects → `/api/auth/oauth2/authorize?<params>`
4. Если cookie нет: redirects → `/`

```typescript
import { getSession } from '@/lib/auth'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET() {
  const session = await getSession()
  if (!session) {
    return NextResponse.redirect(new URL('/sign-in', process.env.BETTER_AUTH_URL!))
  }

  const cookieStore = await cookies()
  const pending = cookieStore.get('oidc_pending')

  if (pending) {
    const params = JSON.parse(Buffer.from(pending.value, 'base64').toString())
    const qs = new URLSearchParams(params).toString()
    const response = NextResponse.redirect(new URL(`/api/auth/oauth2/authorize?${qs}`, process.env.BETTER_AUTH_URL!))
    response.cookies.delete('oidc_pending')
    return response
  }

  return NextResponse.redirect(new URL('/', process.env.BETTER_AUTH_URL!))
}
```

#### 3. Направить callbackURL соцсетей на `/auth/post-login`

Файл: `apps/auth-hub/src/app/(auth)/sign-in/_components/oauth-buttons.tsx`

Вместо `callbackUrl = usePostSignInCallback()` использовать фиксированный `/auth/post-login`:

```typescript
export function AuthOAuthButtons() {
  // Соцсети всегда редиректят на /auth/post-login, который читает cookie
  // и продолжает OIDC flow (или идёт на /, если не было OIDC контекста)
  return <OAuthButtons providers={['google', 'github', 'vk', 'yandex']} callbackUrl="/auth/post-login" />
}
```

Email/password оставить как есть (callbackUrl из `usePostSignInCallback`) — там работает и без cookie.

#### 4. Убедиться, что magic link тоже работает

Файл: `apps/auth-hub/src/app/(auth)/sign-in/_components/magic-link-form.tsx`

Magic link после верификации тоже должен читать cookie. Для этого:

- Если в URL при запросе magic link есть OIDC params — сохранить в cookie
- `callbackUrl` для magic link установить в `/auth/post-login`
- Или оставить текущий `usePostSignInCallback` — нужно проверить, работает ли он для magic link сейчас

#### 5. Обновить `handleSwitchAccount` в AccountChooser

Файл: `apps/auth-hub/src/app/oauth/consent/_components/account-chooser.tsx`

Cookie устанавливается на sign-in page (Server Component), поэтому при редиректе на `/sign-in` с OIDC params cookie будет создана автоматически. Изменений в `handleSwitchAccount` не нужно — логика остаётся прежней (передать OIDC params в URL `/sign-in`).

---

### Сценарии тестирования

| Сценарий                                        | Ожидаемый результат                                        |
| ----------------------------------------------- | ---------------------------------------------------------- |
| Смена аккаунта → email/password                 | Возврат на исходный сайт ✅                                |
| Смена аккаунта → Google                         | Возврат на исходный сайт ✅                                |
| Смена аккаунта → VK                             | Возврат на исходный сайт ✅                                |
| Смена аккаунта → Яндекс                         | Возврат на исходный сайт ✅                                |
| Смена аккаунта → Magic Link                     | Возврат на исходный сайт ✅                                |
| Вход на Ключницу напрямую (без OIDC) → Google   | Редирект на `/` (не на `/auth/post-login` — cookie нет) ✅ |
| Cookie истекла за 10 минут                      | Редирект на `/` (не ошибка) ✅                             |
| Прямой переход на `/auth/post-login` без сессии | Редирект на `/sign-in` ✅                                  |

---

### Файлы к изменению

```
apps/auth-hub/src/app/(auth)/sign-in/page.tsx           ← установка oidc_pending cookie
apps/auth-hub/src/app/auth/post-login/route.ts           ← новый route: читает cookie, продолжает OIDC
apps/auth-hub/src/app/(auth)/sign-in/_components/oauth-buttons.tsx  ← callbackUrl → /auth/post-login
apps/auth-hub/src/app/(auth)/sign-in/_components/magic-link-form.tsx ← проверить/обновить
```

---

## v0.5.0 — Глобальный выход: RP-Initiated Logout

### Проблема

Кнопка «Выйти» на клиентских сайтах (archetest, time, grandslamcup, kami, animatrona-tracker, dashboard) очищает только **локальную** Better Auth сессию (cookie сайта). Сессия на Ключнице (`auth.letar.best`) при этом **не завершается**.

Последствия:

- Пользователь нажал «Выйти» на archetest — он вышел с archetest, но на Ключнице остался залогинен
- Если пользователь снова заходит на archetest (или любой другой OIDC-сайт), SSO срабатывает автоматически — он попадает обратно без ввода пароля
- Невозможно полноценно выйти со всех устройств через один клик
- На чужом компьютере «выйти» нельзя — другой человек просто снова войдёт через SSO

### Решение: RP-Initiated Logout (OIDC стандарт)

Стандарт [OpenID Connect RP-Initiated Logout](https://openid.net/specs/openid-connect-rpinitiated-1_0.html) описывает механизм, при котором клиентское приложение (RP) инициирует выход на стороне OIDC-провайдера.

**Итоговый flow выхода:**

```
1. Пользователь жмёт «Выйти» на клиентском сайте
2. Клиент вызывает signOut() → очищает локальную сессию (cookie)
3. Клиент делает 302 редирект → auth.letar.best/api/auth/oauth2/end_session
   Параметры: client_id, post_logout_redirect_uri (опционально id_token_hint)
4. Ключница завершает OIDC сессию пользователя
5. Ключница делает 302 редирект → post_logout_redirect_uri клиента
   (например /sign-in или /logged-out на сайте клиента)
6. Пользователь видит страницу входа — он вышел везде
```

**Что НЕ выбрано и почему:**

- ❌ **Back-channel logout** (OIDC Back-Channel Logout spec) — Ключница уведомляет клиентов server→server. Сложнее в реализации, требует отдельного logout endpoint на каждом клиенте, избыточно.
- ❌ **Front-channel logout через iframe** — Ключница грузит скрытые iframe всех клиентов для выхода параллельно. Проблемы с CSP, Safari ITP, 3rd-party cookies.
- ✅ **RP-Initiated Logout** — самый простой и стандартный вариант. Один редирект.

---

### Задачи

#### 1. Ключница (auth-hub) — проверить и настроить `end_session_endpoint`

**1.1. Проверить поддержку `end_session_endpoint` в better-auth**

Better Auth oidcProvider вероятно реализует `end_session_endpoint` как часть стандарта. Нужно проверить через:

- `GET https://auth.letar.best/api/auth/.well-known/openid-configuration` → есть ли поле `end_session_endpoint`
- Документация better-auth oidcProvider

Если endpoint есть — идём дальше. Если нет — нужно реализовать его вручную (API route `/api/auth/[...betterauth]/route.ts` уже есть, добавить `GET /oauth/end-session`).

**1.2. Добавить `post_logout_redirect_uris` в каждый trustedClient**

В `apps/auth-hub/src/lib/auth.ts` → секция `trustedClients` — добавить поле `postLogoutRedirectUris` для каждого клиента:

| Клиент                  | `post_logout_redirect_uri`                                                       |
| ----------------------- | -------------------------------------------------------------------------------- |
| archetest-prod          | `https://archetest.letar.best/sign-in`                                           |
| time-prod               | `https://time.letar.best/`                                                       |
| grandslamcup-prod       | `https://grandslamcup.letar.best/sign-in`, `https://gsc-test.letar.best/sign-in` |
| kami-prod               | `https://kami.letar.best/sign-in`                                                |
| animatrona-tracker-prod | `https://animatrona-tracker.letar.best/sign-in`                                  |
| dashboard-prod          | `https://dash.letar.best/auth/signin`                                            |

Также добавить localhost-варианты для разработки.

**1.3. (Если нужно) Страница `/oauth/logged-out` на Ключнице**

Если better-auth при end_session редиректит на свою страницу до редиректа к клиенту — возможно нужна промежуточная страница. Уточнить по итогам п.1.1.

---

#### 2. `libs/auth` — расширить `createLogoutAction`

Файл: `libs/auth/src/server/factories/create-logout-action.ts`

Добавить поддержку OIDC logout через новую опцию:

```typescript
interface OidcLogoutOptions {
  /** URL end_session_endpoint Ключницы */
  endSessionUrl: string
  /** OIDC client_id этого приложения */
  clientId: string
  /** URL, куда Ключница вернёт пользователя после выхода */
  postLogoutRedirectUri: string
}

interface LogoutActionOptions {
  redirectTo?: string
  oidcLogout?: OidcLogoutOptions // НОВОЕ
  onBeforeLogout?: () => Promise<void>
  onAfterLogout?: () => Promise<void>
}
```

**Новое поведение с `oidcLogout`:**

1. Вызвать `auth.api.signOut()` — очистить локальную сессию
2. Вызвать `onAfterLogout?.()` callbacks
3. Вместо `redirect(redirectTo)` — сделать `redirect(endSessionUrl + queryParams)`

Итоговый URL редиректа:

```
https://auth.letar.best/api/auth/oauth2/end_session
  ?client_id=archetest-prod
  &post_logout_redirect_uri=https%3A%2F%2Farchetest.letar.best%2Fsign-in
```

Опция `id_token_hint` — **не используем** (optional по стандарту, требует хранить id_token, усложняет). Ключница должна доверять `client_id`.

---

#### 3. Клиентские приложения — обновить logout

Для каждого из 6 приложений сделать одинаковые изменения.

**Файл:** `apps/<app>/src/app/_actions/auth.actions.ts`

Текущее состояние (неправильно):

- archetest, time, grandslamcup: `signOut()` клиентский — не через createLogoutAction
- kami: `createLogoutAction(auth)` — только локальный signOut
- animatrona-tracker: `signOut()` клиентский
- dashboard: `signOut()` клиентский

**Что сделать по каждому:**

| Приложение             | Порт dev | `client_id`               | Файлы для изменения                                            |
| ---------------------- | -------- | ------------------------- | -------------------------------------------------------------- |
| **archetest**          | 3012     | `archetest-prod`          | `_actions/auth.actions.ts` + header.tsx + mobile-drawer.tsx    |
| **time**               | 3013     | `time-prod`               | `_actions/auth.actions.ts` + toolbar.tsx                       |
| **grandslamcup**       | ?        | `grandslamcup-prod`       | `_actions/auth.actions.ts` + user-menu.tsx + mobile-drawer.tsx |
| **kami**               | ?        | `kami-prod`               | `_actions/auth.actions.ts` + sign-out-button.tsx               |
| **animatrona-tracker** | ?        | `animatrona-tracker-prod` | `_actions/auth.actions.ts` + profile-client.tsx                |
| **dashboard**          | ?        | `dashboard-prod`          | `_actions/auth.actions.ts` + Sidebar.tsx                       |

**Паттерн для каждого:**

```typescript
// apps/archetest/src/app/_actions/auth.actions.ts
'use server'

import { auth } from '@/lib/auth'
import { createLogoutAction } from '@letar/auth/server'

export const logoutAction = createLogoutAction(auth, {
  oidcLogout: {
    endSessionUrl: 'https://auth.letar.best/api/auth/oauth2/end_session',
    clientId: 'archetest-prod',
    postLogoutRedirectUri: 'https://archetest.letar.best/sign-in',
  },
})
```

**Клиентские компоненты** — заменить прямой вызов `signOut()` на вызов Server Action через `<form action={logoutAction}>` или `startTransition(() => logoutAction())`. Это важно: редирект на Ключницу должен происходить на сервере (Server Action делает `redirect()`), а не на клиенте (чтобы не получить CORS).

---

#### 4. Добавить `BETTER_AUTH_OIDC_ISSUER` env var в клиентские приложения

Для гибкости — URL Ключницы не хардкодить, а брать из env:

```env
# .env клиентского приложения
BETTER_AUTH_OIDC_ISSUER=https://auth.letar.best
OIDC_CLIENT_ID=archetest-prod
```

Тогда в `auth.actions.ts`:

```typescript
endSessionUrl:;
;`${process.env.BETTER_AUTH_OIDC_ISSUER}/api/auth/oauth2/end_session`
```

---

#### 5. Тестирование

- [ ] Войти на archetest через Ключницу
- [ ] Нажать «Выйти» — убедиться, что редиректит через auth.letar.best/end_session
- [ ] После выхода — зайти снова на archetest — должен появиться экран входа (не SSO автоматически)
- [ ] Выйти с одного сайта — проверить что другой сайт тоже требует логин
- [ ] Кнопка выхода на самой Ключнице (`/profile`) — проверить что она **не** делает OIDC logout (у неё нет client_id)

---

### Файлы к изменению (чеклист)

```
libs/auth/src/server/factories/create-logout-action.ts   ← добавить OidcLogoutOptions
apps/auth-hub/src/lib/auth.ts                             ← постараться добавить postLogoutRedirectUris
apps/archetest/src/app/_actions/auth.actions.ts           ← создать, использовать createLogoutAction
apps/archetest/src/app/[locale]/_components/header.tsx    ← заменить signOut() на logoutAction
apps/archetest/src/app/[locale]/_components/mobile-drawer.tsx
apps/time/src/app/_actions/auth.actions.ts
apps/time/src/app/_components/toolbar.tsx
apps/grandslamcup/src/app/_actions/auth.actions.ts
apps/grandslamcup/src/app/_components/header/user-menu.tsx
apps/grandslamcup/src/app/_components/header/mobile-drawer.tsx
apps/kami/src/app/_actions/auth.actions.ts                ← обновить createLogoutAction с oidcLogout
apps/kami/src/app/_components/header/sign-out-button.tsx
apps/animatrona-tracker/src/app/_actions/auth.actions.ts
apps/animatrona-tracker/src/app/profile/_components/profile-client.tsx
apps/dashboard/src/app/_actions/auth.actions.ts
apps/dashboard/src/app/_components/layout/Sidebar.tsx
```

---

### Риски и открытые вопросы

1. **Поддерживает ли better-auth oidcProvider `end_session_endpoint`?** — Проверить п.1.1 перед началом. Если нет — нужно реализовать кастомный route.

2. **Локальная разработка** — в dev окружении `endSessionUrl` должен указывать на `http://localhost:3014`, а `postLogoutRedirectUri` — на `http://localhost:<port>`. Решение: env vars (см. п.4).

3. **id_token_hint** — Без него некоторые OIDC провайдеры отказывают. Если better-auth требует — нужно научиться читать id_token из аккаунта. Проверить по итогам тестирования п.1.1.

4. **Параллельный выход** — RP-Initiated Logout завершает только OIDC сессию на Ключнице, но не завершает сессии других клиентских приложений. То есть: пользователь вышел с archetest → вышел с Ключницы → но на time.letar.best сессия ещё активна до истечения. Это **нормальное поведение** для OIDC (front-channel/back-channel logout для мгновенной инвалидации — за рамками этой задачи).

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
