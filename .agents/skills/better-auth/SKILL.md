---
name: better-auth
description: |
  Better Auth в Next.js 16 + ZenStack: конфиг betterAuth(), OAuth (Google, Яндекс, VK ID), плагины (organization, emailOTP, anonymous, oauth-provider), proxy.ts, роли. Загружай ДО правки lib/auth.ts или моделей Account/Session и когда любой /api/auth/* падает 500 без строки в логах, SCHEMA_MISMATCH при старте, вход ломается после bun update better-auth, не приходит emailOTP, в dev «Invalid Base64 character» из-за чужой сессии.
---

# Better Auth Specialist

Эксперт по аутентификации Better Auth в контексте Next.js 16, ZenStack и Prisma.

## ⚠️ Ловушки (разборы в доках)

- [better-auth-prismaadapter-zenstack-incompatibility](/.claude/docs/better-auth-prismaadapter-zenstack-incompatibility.md) — `/api/auth/*` падает 500 без строк в логах: `prismaAdapter()` не принимает ZenStack-клиент
- [better-auth-plugin-modelname-casing-schema-mismatch](/.claude/docs/better-auth-plugin-modelname-casing-schema-mismatch.md) — `SCHEMA_MISMATCH` при старте называет отсутствующей таблицу, которая есть
- [better-auth-1.7-oidc-provider-removed](/.claude/docs/better-auth-1.7-oidc-provider-removed.md) — `bun update` поднимает better-auth до 1.7: `oidcProvider` убран из ядра
- [better-auth-1.7-account-issuer-field](/.claude/docs/better-auth-1.7-account-issuer-field.md) — тот же релиз требует поле `issuer` в модели `Account`
- [better-auth-emailotp-silent-send-failure](/.claude/docs/better-auth-emailotp-silent-send-failure.md) — `emailOTP` не пробрасывает сбой отправки письма
- [better-auth-localhost-cookie-jar-collision](/.claude/docs/better-auth-localhost-cookie-jar-collision.md) — dev-серверы делят cookie-jar `localhost`: `Invalid Base64 character`
- [better-auth-vk-id-migration-and-linksocial-pitfalls](/.claude/docs/better-auth-vk-id-migration-and-linksocial-pitfalls.md) — VK ID вместо legacy `oauth.vk.com`; `linkSocial()` без email

## Когда использовать

- Настройка аутентификации в новом приложении
- **Миграция с NextAuth/Auth.js на Better Auth** 🔥
- Добавление OAuth провайдеров (Google, Yandex, VK)
- Настройка защиты роутов (proxy.ts)
- Работа с сессиями и ролями
- Интеграция с ZenStack access policies
- Добавление плагинов (2FA, Admin, Organization)
- Troubleshooting auth проблем

## Паттерны проекта

- **Session-based** аутентификация (сессии в БД, не JWT)
- **proxy.ts** работает в Node.js Runtime (полный доступ к БД)
- **ZenStack** для row-level access control через `@@allow`/`@@deny`
- **Enhanced Prisma** клиент применяет политики автоматически

## Quick Reference

### Получение сессии (сервер)

```typescript
import { auth } from '@/lib/auth'
import { headers } from 'next/headers'

const session = await auth.api.getSession({ headers: await headers() })
```

### Получение сессии (клиент)

```typescript
import { useSession } from '@/lib/auth-client'

const { data: session, isPending } = useSession()
```

### ZenStack с auth

```typescript
const session = await auth.api.getSession({ headers: await headers() })
const db = getEnhancedPrisma(session?.user)
// Политики @@allow/@@deny применяются автоматически
```

## Ключевые команды

```bash
# Миграция БД (добавление таблиц плагинов)
npx @better-auth/cli migrate

# Генерация схемы (для Prisma)
npx @better-auth/cli generate
```

## Reference файлы

| Файл                                   | Описание                            |
| -------------------------------------- | ----------------------------------- |
| `reference/nextauth-migration.md`      | 🔥 Миграция с NextAuth (ПРИОРИТЕТ!) |
| `reference/nextjs-integration.md`      | Next.js 16 интеграция               |
| `reference/prisma-adapter.md`          | Prisma адаптер и оптимизация        |
| `reference/session-management.md`      | Сессии, кэширование, revoke         |
| `reference/oauth-providers.md`         | Google, Yandex, VK OAuth            |
| `reference/email-password.md`          | Email/пароль, PIN-верификация       |
| `reference/admin-plugin.md`            | Управление пользователями           |
| `reference/organization-plugin.md`     | Организации и команды               |
| `reference/2fa-plugin.md`              | Двухфакторная аутентификация        |
| `reference/hooks-lifecycle.md`         | Before/After хуки                   |
| `reference/security-best-practices.md` | Безопасность production             |
| `reference/troubleshooting.md`         | Типичные проблемы                   |

## Связанная документация

- `.claude/docs/auth.md` — Полная документация по auth в проекте
- `.claude/skills/zenstack-helper/` — Access policies
