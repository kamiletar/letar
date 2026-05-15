# Kami

Платформа для работы с контентом и управлением знаниями.

## Версия

**0.10.0**

## Технологический стек

- Next.js 16 (App Router)
- React 19
- Chakra UI v3
- PostgreSQL + Prisma + ZenStack

## Структура документации

| Файл                                     | Описание            |
| ---------------------------------------- | ------------------- |
| [PLAN.md](./PLAN.md)                     | Техническое задание |
| [PLAN_COMPLETED.md](./PLAN_COMPLETED.md) | Выполненные задачи  |
| [PLAN_TESTING.md](./PLAN_TESTING.md)     | План тестирования   |
| [CHANGELOG.md](./CHANGELOG.md)           | История изменений   |

## Быстрый старт

```bash
# Разработка
nx dev kami

# Сборка
nx build kami

# Тесты
nx test kami
```

## Порт

**3005**

## Архитектура

### UserProvider (контекст пользователя)

Серверный layout получает сессию и роли один раз, передаёт через React Context во все клиентские компоненты. Это избавляет от повторных запросов к БД и проблем с cookie cache Better Auth.

```tsx
// Любой клиентский компонент
import { useUser } from '@/app/_components/user-provider'

function MyComponent() {
  const { isAdmin, isAuthenticated, name, roles } = useUser()

  if (isAdmin) {
    return <AdminPanel />
  }
  // ...
}
```

**Компонент `OnlyFor`** — условный рендеринг по ролям:

```tsx
import { OnlyFor } from '@/app/_components/only-for'
;<OnlyFor role="ADMIN">
  <AdminOnlyContent />
</OnlyFor>
```

Оба компонента используют данные из `UserProvider` — без запросов к БД, без ожидания загрузки сессии.

---

**Последнее обновление:** 2026-03-19
