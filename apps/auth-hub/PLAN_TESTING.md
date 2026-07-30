# План тестирования

## Статистика

| Тип  | Количество | Статус                                                    |
| ---- | ---------- | --------------------------------------------------------- |
| Unit | 4          | `resolve-login-email.spec.ts` (vitest, environment: node) |
| E2E  | 9          | apps/auth-hub-e2e, chromium                               |

## Запуск тестов

```bash
nx test auth-hub
nx e2e auth-hub-e2e
```

## E2E (apps/auth-hub-e2e)

Создан по образцу `apps/grandslamcup-e2e` (§18.6 Сессия J — закрытие пробела: у auth-hub
никогда не было staging e2e, только ручной curl/browser-check при rollout-деплое).

- **Dev-session роут:** `src/app/api/auth/dev-session/route.ts` — `createDevSessionRoute` из
  `@letar/auth/server`, `defaultEmail: admin@auth.letar.best`. `ALLOW_DEV_SESSION`/
  `DEV_SESSION_TOKEN` только в `.env.staging`, никогда в `.env.docker`.
- `01-public.spec.ts` — `/sign-in` (email/password форма, magic link, OAuth-кнопки) и
  `/sign-up` без авторизации.
- `02-admin.spec.ts` — редирект `/admin` на `/sign-in` без сессии; `/admin`, `/admin/users`,
  `/admin/clients` с авторизованной admin-сессией (dev-session).
- `03-oidc-authorize.spec.ts` — смоук `/sign-in` и `/api/auth/oauth2/authorize` с произвольными
  OIDC query-параметрами без сессии — не 500 (не привязан к конкретному seeded client_id).
- `04-linked-email-login.spec.ts` (2026-07-30) — вход по подтверждённому linked-email (Этап 8.5):
  primary-аккаунт создаётся через реальный `/api/auth/sign-up/email` (пароль хешируется штатным
  scrypt Better Auth), linked-email вставляется напрямую в БД через `helpers/db.helpers.ts`
  (`ensureVerifiedLinkedEmail`/`deleteUserEmail`/`findUserByEmail`, CJS-wrapper над
  generated-клиентом auth-hub по образцу driving-school-e2e). Два кейса: успешный вход под
  primary-сессией + «Неверный пароль» без дубль-регистрации. ⚠️ Требует `NODE_ENV=development`
  (`requireEmailVerification=false` в dev, см. `buildHubProviderAuth`) — не годится для staging/prod
  прогона как есть.

Только `chromium` project первым заходом — WebKit/Firefox не обязательны для первичного
покрытия.

## Unit (apps/auth-hub, vitest)

- `src/lib/resolve-login-email.spec.ts` (2026-07-30) — 4 кейса `resolveLoginEmail`: нет
  linked-адреса, приоритет primary над linked, резолв подтверждённого linked-email, игнор
  неподтверждённого. `environment: 'node'` (не нужен jsdom — чистая server-логика с мокнутым
  `prisma`). Инфраструктура (`vitest.config.ts`, `tsconfig.spec.json`) — по образцу archetest,
  см. `.claude/docs/unit-testing.md`.

## План по фазам

### Фаза 1

- [x] E2E: базовый смоук sign-in/sign-up/admin/OIDC (chromium)
- [x] Тесты авторизации (`resolveLoginEmail`) — unit (2026-07-30)
- [ ] Тесты OAuth flow — unit
- [x] E2E: вход по linked-email (Этап 8.5) — `04-linked-email-login.spec.ts` (2026-07-30)
- [ ] E2E: полный цикл регистрации (email verification)
- [ ] E2E: passkey / magic-link happy path
- [ ] E2E: WebKit/Firefox проекты
