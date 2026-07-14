# План тестирования

## Статистика

| Тип  | Количество | Статус                                     |
| ---- | ---------- | ------------------------------------------ |
| Unit | 0          | Планируется                                |
| E2E  | 7          | Первый заход (apps/auth-hub-e2e, chromium) |

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

Только `chromium` project первым заходом — WebKit/Firefox не обязательны для первичного
покрытия.

## План по фазам

### Фаза 1

- [x] E2E: базовый смоук sign-in/sign-up/admin/OIDC (chromium)
- [ ] Тесты авторизации (login/signup) — unit
- [ ] Тесты OAuth flow — unit
- [ ] E2E: полный цикл регистрации (email verification)
- [ ] E2E: passkey / magic-link happy path
- [ ] E2E: WebKit/Firefox проекты
