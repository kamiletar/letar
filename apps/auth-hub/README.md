# auth-hub

Хаб аутентификации. Централизованное управление авторизацией через Better Auth с поддержкой OAuth (Google, Yandex, VK, Telegram). Панель администратора для управления пользователями.

## Документация

| Файл                                     | Описание                    |
| ---------------------------------------- | --------------------------- |
| [PLAN.md](./PLAN.md)                     | Текущие задачи и приоритеты |
| [PLAN_COMPLETED.md](./PLAN_COMPLETED.md) | Реализованные фичи          |
| [PLAN_TESTING.md](./PLAN_TESTING.md)     | План тестирования           |
| [CHANGELOG.md](./CHANGELOG.md)           | История изменений           |

## Стек

- **Фреймворк:** Next.js 16 (App Router)
- **UI:** Chakra UI v3
- **Auth:** Better Auth + OAuth
- **БД:** PostgreSQL + Prisma + ZenStack

## Команды

```bash
nx dev auth-hub
nx build auth-hub
nx lint auth-hub
nx typecheck:tsgo auth-hub
```

---

**Версия:** 0.1.0
**Последнее обновление:** 2026-04-04
