---
paths: 'apps/**/app/**/page.tsx, apps/**/app/**/layout.tsx, apps/**/app/**/route.ts, apps/**/next.config.*'
---

# Правила для Next.js приложений

## App Router (Next.js 16)

- Используй App Router (`app/` директория), не Pages Router
- Server Components по умолчанию, `'use client'` только когда нужно
- Server Actions в `_actions/` папках с суффиксом `.action.ts`
- Layouts в `layout.tsx`, loading states в `loading.tsx`

## Структура папок

```
app/
├── _actions/        # Server Actions
├── _components/     # Shared компоненты страницы
├── _hooks/          # Кастомные хуки
├── _schemas/        # Zod схемы валидации
├── (auth)/          # Группа роутов для аутентификации
├── admin/           # Админ-панель
└── api/             # API роуты
```

## Импорты

```typescript
// Используй path aliases
import { Component } from '@/app/_components/Component'
import { schema } from '@/app/_schemas/my-schema'

// Не используй относительные пути для глубоких импортов
// ❌ import { x } from '../../../_components/x'
```

## Метаданные

```typescript
// Статические метаданные
export const metadata: Metadata = {
  title: 'Страница',
  description: 'Описание',
}

// Динамические метаданные
export async function generateMetadata({ params }): Promise<Metadata> {
  return { title: `Товар ${params.id}` }
}
```

## Правила

- **MUST** использовать App Router, **NEVER** Pages Router
- **MUST** использовать `proxy.ts` вместо `middleware.ts` (Next.js 16)
- **SHOULD** Server Components по умолчанию
- **NEVER** использовать относительные пути для глубоких импортов

## Документация

→ **Skill: `nextjs-expert`** — паттерны Next.js 16
→ **Skill: `better-auth`** — аутентификация
→ Используй `next-devtools` MCP для актуальной документации
