# Выполненные задачи

Детальное описание всех реализованных фич auth-hub.

## Версия 0.6.0 — деплой 2026-06-18 (Этап 9: деплой + верификация)

### Деплой Этапа 8

- `AUTH_ENCRYPTION_KEY` добавлен в `.env.docker.enc` (commit `2ed6f12`) и сохранён в KeePassXC
- BlackCove выполнил деплой auth-hub, `/sync-env`, перезапуск контейнера
- После деплоя auth.letar.best был недоступен (500) — причина: `AUTH_ENCRYPTION_KEY` не попал в контейнер без `/sync-env`. Исправлено срочным запросом BlackCove
- Backfill `encrypt-client-secrets.ts --execute` выполнен BlackCove (подтверждено msg #918)
- `kami@letar.best` повышен до ADMIN роли через SQL UPDATE (BlackCove msg #919)
- Admin UI `/admin/clients` верифицирован вручную: 7 клиентов активны, все кнопки работают

### Проблема с agent-mail fetch_inbox

`fetch_inbox` возвращает только метаданные без тела сообщений — ответы BlackCove были незаметны, что привело к 4 повторным пингам про backfill. Нужно использовать `search_messages` с последующим чтением или попросить BlackCove дублировать ответы в теме письма.

---

## Версия 0.6.0 — 2026-06-15 (Этап 8: Admin UI + at-rest шифрование)

### Admin UI OAuth-клиентов (`/admin/clients`)

Полный CRUD для управления OIDC-приложениями Ключницы:

- **Список** (`/admin/clients`) — таблица с бейджами статуса, кнопками toggle/edit
- **Создание** (`/admin/clients/new`) — двухэтапный флоу:
  1. `RisksConsent` — экран с 4 рисками hub-client режима (бренд, OAuth-аккаунт, user.id, 152-ФЗ)
  2. `ClientForm` — имя, clientId, redirect URLs, тип (web/spa/native), skipConsent
  - После создания: redirect на `/admin/clients/<id>?secret=<plaintext>` → `SecretBanner`
- **Детали** (`/admin/clients/[id]`) — карточка с атрибутами + `RotateSecretButton` + `DeleteClientButton`
- **Редактирование** (`/admin/clients/[id]/edit`) — форма с locked clientId

**`SecretBanner`** — plaintext секрет отображается ОДИН РАЗ через `?secret=` в URL. Исчезает через 5 минут или при перезагрузке. Кнопка «Скопировать».

**Server actions** (`_actions/client.action.ts`): `createClientAction`, `updateClientAction`, `rotateSecretAction`, `deleteClientAction`. Валидация через Zod с `.strip()`.

### At-rest шифрование (`libs/auth/server/crypto.ts`)

**AES-256-GCM** — для долгосрочных секретов (`clientSecret`):

- Каждый вызов → уникальный random IV → не-детерминированный
- Формат: `gcm:<iv-hex>:<cipher-hex>:<tag-hex>`
- Обратная совместимость: plaintext без `gcm:` префикса → возвращается без изменений

**AES-256-CBC детерминированный** — для токенов, где нужен WHERE lookup:

- IV = первые 16 байт HMAC-SHA256(key, salt) → уникален per-field, детерминирован
- Формат: `cbc:<cipher-hex>`
- Применяется для `oauthAccessToken.accessToken/refreshToken`

**10 unit-тестов** в `crypto.spec.ts`: round-trip, random IV, детерминированность, обратная совместимость, error cases.

### Encryption ORM proxy (`src/lib/crypto-orm.ts` + `src/lib/db.ts`)

Прозрачное шифрование через Proxy без изменений кода потребителей:

| Модель             | Поле                          | Метод                         |
| ------------------ | ----------------------------- | ----------------------------- |
| `oauthApplication` | `clientSecret`                | GCM (non-deterministic)       |
| `oauthAccessToken` | `accessToken`, `refreshToken` | CBC (deterministic для WHERE) |
| `account`          | `accessToken`, `refreshToken` | GCM                           |

**Dev-режим**: если `AUTH_ENCRYPTION_KEY` не задан → предупреждение в консоль, шифрование пропускается. В production → `throw`.

### Social provider loader (`libs/auth/server/social-loader.ts`)

```typescript
export const auth = await createAuthAsync({
  mode: 'standalone',
  social: { source: 'db', load: createSocialProviderLoader(prisma, decryptSecret, key) },
  // ...
})
```

Читает таблицу `socialProvider` из БД, расшифровывает `clientSecret`, передаёт в Better Auth.

### Backfill скрипт (`scripts/encrypt-client-secrets.ts`)

```bash
# Dry-run (показывает что будет зашифровано):
bun run scripts/encrypt-client-secrets.ts

# Реальное шифрование:
bun run scripts/encrypt-client-secrets.ts --execute
```

Идемпотентен: уже зашифрованные записи (`gcm:` prefix) пропускает.

### Исправления инфраструктуры

- `libs/auth/tsconfig.lib.json` — добавлено исключение `src/**/*.spec.ts` из lib-сборки (tsc падал на spec-файлах при генерации `.d.ts`)
- `libs/auth/src/server/create-auth/index.ts` — cast через `unknown` для `buildHubProviderAuth` чтобы избежать непортабельной ссылки на Zod в `.d.ts`

### Файлы

- `libs/auth/src/server/crypto.ts` — AES-256-GCM/CBC функции
- `libs/auth/src/server/crypto.spec.ts` — 10 unit-тестов
- `libs/auth/src/server/social-loader.ts` — DB loader для провайдеров
- `libs/auth/src/server/index.ts` — экспорт (обновлён)
- `libs/auth/src/server/create-auth/types.ts` — `StandaloneSocialSource` тип
- `libs/auth/src/server/create-auth/index.ts` — `createAuthAsync()` + `resolveSocialProviders()`
- `apps/auth-hub/src/lib/crypto-orm.ts` — encryption proxy для 3 моделей
- `apps/auth-hub/src/lib/db.ts` — ORM с encryption proxy
- `apps/auth-hub/src/lib/prisma.ts` — re-export шим
- `apps/auth-hub/src/app/admin/clients/**` — 10 файлов Admin UI
- `apps/auth-hub/scripts/encrypt-client-secrets.ts` — backfill скрипт

**Коммит:** `4e70c76`

---

## Версия 0.2.1 — 2026-04-10

### Fix: продолжение OIDC flow после OAuth на /sign-in

**Проблема:** Пользователь, попадая из клиентского приложения на `auth.letar.best/sign-in?client_id=...&redirect_uri=...&response_type=code&state=...` (OIDC authorization_code flow), после успешного логина через Google/Яндекс/VK/GitHub оказывался на главной ключницы вместо возврата в клиентское приложение. Better Auth OIDC Provider сохранял query в cookie `oidc_login_prompt` и редиректил на `loginPage` со всеми параметрами, но на странице `/sign-in` ни OAuth кнопки, ни email-форма не использовали этот query для восстановления OIDC flow — передавали дефолтный `callbackURL = '/'` в Better Auth.

**Решение:**

- Создан хук `src/app/(auth)/_hooks/use-post-sign-in-callback.ts`, который проверяет наличие OIDC параметров (`client_id` + `redirect_uri` + `response_type`) в query и возвращает `/api/auth/oauth2/authorize?<исходная query>`, если это OIDC flow. После успеха Better Auth редиректит на этот внутренний URL, authorize endpoint находит свежую сессию и продолжает выдачу кода клиентскому приложению.
- `AuthOAuthButtons`, `LoginForm`, `MagicLinkForm` на `/sign-in` используют этот хук и передают результат как `callbackURL` в `signIn.social` / `signIn.oauth2` / `auth.api.signInEmail` / `auth.api.signInMagicLink`.
- `libs/auth/src/client/oauth-buttons.tsx` уже поддерживал проп `callbackUrl` — правок не потребовалось.

## Версия 0.1.0

### Реализовано

- Базовая структура приложения (Next.js 16 + Chakra UI v3)
- Роуты авторизации (login, signup)
- OAuth интеграция
- Панель администратора (каркас)
- Профиль пользователя (каркас)

---

**Последнее обновление:** 2026-04-10
