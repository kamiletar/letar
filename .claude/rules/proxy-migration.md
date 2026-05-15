---
paths: '**/middleware.ts, **/proxy.ts'
---

# ⚠️ Next.js 16: middleware.ts → proxy.ts

## КРИТИЧНО: Миграция обязательна!

В Next.js 16 файл `middleware.ts` **ЗАМЕНЁН** на `proxy.ts`.

**NEVER** создавай новый `middleware.ts` — используй `proxy.ts`.

## Если видишь `middleware.ts`

1. Это legacy код, требует миграции
2. Создай `proxy.ts` с новым API
3. Удали старый `middleware.ts`

## Основные изменения API

| middleware.ts (старый)    | proxy.ts (новый)       |
| ------------------------- | ---------------------- |
| `NextRequest`             | `ProxyRequest`         |
| `NextResponse.next()`     | `return request`       |
| `NextResponse.redirect()` | `redirect()`           |
| `NextResponse.rewrite()`  | `rewrite()`            |
| matcher в config          | route patterns в файле |

## Пример proxy.ts

```typescript
// apps/<app>/proxy.ts
import { auth } from '@/lib/auth'

export default auth((request) => {
  // Защита роутов
  const { pathname } = request.nextUrl

  if (pathname.startsWith('/admin')) {
    // Проверка роли выполняется в auth()
  }
})

export const config = {
  matcher: ['/admin/:path*', '/api/:path*'],
}
```

## Интеграция с Better Auth

```typescript
// apps/<app>/proxy.ts
import { auth } from '@/lib/auth'

// auth() автоматически проверяет сессию
export default auth((request) => {
  // request.auth содержит сессию если пользователь авторизован
  if (!request.auth && request.nextUrl.pathname.startsWith('/admin')) {
    return Response.redirect(new URL('/login', request.url))
  }
})
```

## Документация

→ Используй `next-devtools` MCP → `nextjs_docs` для актуальной документации
→ Skill: `better-auth` для паттернов аутентификации
