# Configuration

Конфигурация Next.js 16 приложений.

---

## next.config.js

### Базовая конфигурация (Letar)

```javascript
// next.config.js
import withBundleAnalyzer from '@next/bundle-analyzer'
import { composePlugins, withNx } from '@nx/next'

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Docker-оптимизированный output
  output: 'standalone',

  // SEO: trailing slashes
  trailingSlash: true,

  // Node.js зависимости (не бандлить)
  serverExternalPackages: ['@prisma/client', 'prisma'],

  // Оптимизация изображений
  images: {
    qualities: [25, 50, 75, 90],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.example.com',
      },
    ],
  },

  // Оптимизация импортов (tree-shaking)
  experimental: {
    optimizePackageImports: ['@chakra-ui/react', 'react-icons', 'lucide-react'],
  },

  // Transpile монорепо пакеты
  transpilePackages: ['@letar/chakra-provider', '@letar/ui'],

  // Security headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
        ],
      },
    ]
  },

  // Redirects
  async redirects() {
    return [
      {
        source: '/old-page',
        destination: '/new-page',
        permanent: true, // 308
      },
    ]
  },

  // Rewrites (proxy)
  async rewrites() {
    return [
      {
        source: '/api/external/:path*',
        destination: 'https://api.external.com/:path*',
      },
    ]
  },
}

// Compose с Nx и Bundle Analyzer
const plugins = [withNx]

const withAnalyzer = withBundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
})

export default composePlugins(...plugins)(withAnalyzer(nextConfig))
```

---

## proxy.ts (заменил middleware.ts)

В Next.js 16 `middleware.ts` заменён на `proxy.ts`.

### Отличия от middleware

| Аспект      | middleware.ts (устарел)   | proxy.ts (Next.js 16) |
| ----------- | ------------------------- | --------------------- |
| Runtime     | Edge Runtime              | Node.js               |
| Доступ к БД | ❌ Только edge-compatible | ✅ Полный доступ      |
| Prisma      | ❌ Не работает            | ✅ Работает           |
| Размещение  | Root проекта              | Root или app/         |
| API         | `NextResponse`            | Новый Proxy API       |

### Базовый proxy.ts

```typescript
// proxy.ts
import { NextRequest } from 'next/server'
import type { NextFetchEvent } from 'next/server'

export function proxy(request: NextRequest, event: NextFetchEvent) {
  const { pathname } = request.nextUrl

  // Добавить pathname в headers
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-pathname', pathname)

  return {
    request: {
      headers: requestHeaders,
    },
  }
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
```

### Auth защита роутов (Better Auth)

```typescript
// proxy.ts
import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

const protectedPaths = ['/admin', '/profile', '/orders']
const authPaths = ['/sign-in', '/sign-up']

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Получаем сессию через Better Auth API
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  // Защищённые роуты без сессии → редирект на sign-in
  const isProtected = protectedPaths.some((path) => pathname.startsWith(path))
  if (isProtected && !session) {
    return NextResponse.redirect(new URL(`/sign-in?callbackUrl=${pathname}`, request.url))
  }

  // Auth страницы с сессией → редирект на главную
  const isAuthPath = authPaths.some((path) => pathname.startsWith(path))
  if (isAuthPath && session) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
```

### Быстрая проверка cookie (без БД)

```typescript
// proxy.ts — быстрее, но менее безопасно
import { getSessionCookie } from 'better-auth/cookies'
import { NextRequest, NextResponse } from 'next/server'

export async function proxy(request: NextRequest) {
  const sessionCookie = getSessionCookie(request)

  if (!sessionCookie) {
    return NextResponse.redirect(new URL('/sign-in', request.url))
  }

  return NextResponse.next()
}
```

> ⚠️ Cookie-проверка не валидирует сессию — используй полную проверку для защищённых действий.

### i18n с next-intl

```typescript
// proxy.ts
import { routing } from '@/i18n/routing'
import createMiddleware from 'next-intl/middleware'

const intlMiddleware = createMiddleware(routing)

export async function proxy(request: NextRequest) {
  // Сначала next-intl
  const response = intlMiddleware(request)
  if (response) return response

  // Потом другая логика
  // ...

  return {}
}
```

### Matcher паттерны

```typescript
export const config = {
  // Все пути кроме static
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],

  // Конкретные пути
  matcher: ['/admin/:path*', '/profile/:path*'],

  // С регулярками
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)', '/admin/(.*)'],
}
```

---

## Environment Variables

### Типы переменных

| Тип             | Доступ          | Пример                       |
| --------------- | --------------- | ---------------------------- |
| `NEXT_PUBLIC_*` | Клиент + Сервер | `NEXT_PUBLIC_API_URL`        |
| Остальные       | Только Сервер   | `DATABASE_URL`, `SECRET_KEY` |

### .env файлы

```
.env                  # Все окружения (git)
.env.local            # Локальные секреты (не в git!)
.env.development      # Dev окружение
.env.production       # Prod окружение
.env.test             # Test окружение
```

Приоритет: `.env.local` > `.env.{environment}` > `.env`

### Использование

```typescript
// Server Component / Server Action
const dbUrl = process.env.DATABASE_URL // ✅ Работает

// Client Component
const apiUrl = process.env.NEXT_PUBLIC_API_URL // ✅ Работает
const secret = process.env.SECRET_KEY // ❌ undefined
```

### Валидация (Zod)

```typescript
// lib/env.ts
import { z } from 'zod/v4'

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  BETTER_AUTH_SECRET: z.string().min(32), // Better Auth secret
  BETTER_AUTH_URL: z.string().url(), // App URL
  NEXT_PUBLIC_API_URL: z.string().url(),
})

export const env = envSchema.parse({
  DATABASE_URL: process.env.DATABASE_URL,
  BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
  BETTER_AUTH_URL: process.env.BETTER_AUTH_URL,
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
})
```

---

## TypeScript Config

### tsconfig.json приложения

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "ES2022"],
    "jsx": "preserve",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "noEmit": true,
    "incremental": true,
    "esModuleInterop": true,
    "isolatedModules": true,
    "skipLibCheck": true,
    "plugins": [{ "name": "next" }],
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["**/*.ts", "**/*.tsx", ".next/types/**/*.ts", "next-env.d.ts"],
  "exclude": ["node_modules"]
}
```

### Типы для App Router

```typescript
// types/next.d.ts
import { Metadata } from 'next'

declare module 'next' {
  export interface PageProps {
    params: Promise<Record<string, string>>
    searchParams: Promise<Record<string, string | string[] | undefined>>
  }
}
```

---

## Turbopack (Dev)

Next.js 16 использует Turbopack по умолчанию в dev.

### Особенности

- Быстрее webpack в 10-100x
- Инкрементальные сборки
- HMR мгновенный

### Конфигурация

```javascript
// next.config.js
const nextConfig = {
  // Turbopack включён по умолчанию в Next.js 16
  // Для отключения:
  // experimental: {
  //   turbo: false,
  // },
}
```

### Loaders

```javascript
// next.config.js
const nextConfig = {
  experimental: {
    turbo: {
      rules: {
        '*.svg': {
          loaders: ['@svgr/webpack'],
          as: '*.js',
        },
      },
    },
  },
}
```

---

## Nx Integration

### project.json

```json
{
  "name": "premium-rosstil",
  "$schema": "../../node_modules/nx/schemas/project-schema.json",
  "sourceRoot": "apps/premium-rosstil/src",
  "projectType": "application",
  "tags": ["type:app", "scope:premium"],
  "targets": {
    "zenstack:generate": {
      "executor": "nx:run-commands",
      "options": {
        "command": "zenstack generate",
        "cwd": "apps/premium-rosstil"
      }
    },
    "db:push": {
      "executor": "nx:run-commands",
      "options": {
        "command": "prisma db push",
        "cwd": "apps/premium-rosstil"
      },
      "dependsOn": ["zenstack:generate"]
    }
  }
}
```

### Inferred Targets

Nx автоматически создаёт targets из `next.config.js`:

- `build` — Next.js build
- `dev` — Dev server
- `start` — Production server

---

## Security Headers

```javascript
// next.config.js
async headers() {
  return [
    {
      source: '/(.*)',
      headers: [
        // Предотвращает MIME sniffing
        { key: 'X-Content-Type-Options', value: 'nosniff' },

        // Защита от clickjacking
        { key: 'X-Frame-Options', value: 'DENY' },

        // XSS фильтр
        { key: 'X-XSS-Protection', value: '1; mode=block' },

        // Referrer policy
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },

        // Permissions policy
        {
          key: 'Permissions-Policy',
          value: 'camera=(), microphone=(), geolocation=()',
        },
      ],
    },
    {
      // CORS для API
      source: '/api/:path*',
      headers: [
        { key: 'Access-Control-Allow-Origin', value: '*' },
        { key: 'Access-Control-Allow-Methods', value: 'GET, POST, PUT, DELETE' },
      ],
    },
  ]
}
```

---

## Output Modes

| Mode         | Описание                   | Когда               |
| ------------ | -------------------------- | ------------------- |
| `standalone` | Минимальный Node.js сервер | Docker, VPS         |
| `export`     | Static HTML                | Статический хостинг |

```javascript
// next.config.js
const nextConfig = {
  output: 'standalone', // Docker
  // output: 'export',   // Static export
}
```

### Standalone для Docker

```dockerfile
FROM node:24-alpine AS runner
WORKDIR /app

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

EXPOSE 3000
CMD ["node", "server.js"]
```

---

## См. также

- [app-router.md](app-router.md) — Структура роутов
- [optimization.md](optimization.md) — Оптимизация
- [troubleshooting.md](troubleshooting.md) — Решение проблем
