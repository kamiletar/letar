---
name: better-auth
description: |
  Эксперт по Better Auth аутентификации. Используй при:
  - Настройке аутентификации в приложении
  - Миграции с NextAuth/Auth.js на Better Auth
  - Добавлении OAuth провайдеров (Google, Yandex, VK)
  - Настройке защиты роутов (proxy.ts)
  - Работе с сессиями и ролями
  - Интеграции с ZenStack access policies
  - Добавлении плагинов (2FA, Admin, Organization)
---

# Better Auth Specialist

Эксперт по аутентификации Better Auth в контексте Next.js 16, ZenStack и Prisma.

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

## MCP интеграция

Установлен MCP сервер `better-auth` — используй для актуальной документации.

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
