---
name: nextjs-expert
description: |
  Разработка Next.js 16 приложений. Используй при:
  - Создании страниц и layouts
  - Работе с Server/Client Components
  - Data fetching и Server Actions
  - Оптимизации производительности
  - SEO и metadata
  - Troubleshooting Next.js
---

# Next.js Expert

Руководство по разработке Next.js приложений в монорепо Lena.

## Когда использовать

- Создание новых страниц и layouts
- Работа с Server/Client Components
- Data fetching и Server Actions
- Оптимизация производительности
- SEO и metadata
- Troubleshooting Next.js

---

## Проекты Lena (Next.js 16)

| App             | Порт | Особенности                     |
| --------------- | ---- | ------------------------------- |
| premium-rosstil | 3000 | i18n (next-intl), ZenStack, PWA |
| imot            | 3001 | Better Auth, ZenStack           |
| dashboard       | 3002 | SSE, React Query                |
| driving-school  | 3003 | Базовый App Router              |
| mandala         | 3004 | SSG, OG images                  |
| kami            | 3005 | Keystatic CMS, i18n             |

---

## Quick Reference

### Создание страницы

```typescript
// app/products/page.tsx (Server Component)
export default async function ProductsPage() {
  const products = await db.product.findMany()
  return <ProductList products={products} />
}

// app/products/loading.tsx
export default function Loading() {
  return <Skeleton />
}

// app/products/error.tsx
'use client'
export default function Error({ error, reset }) {
  return <ErrorMessage error={error} onRetry={reset} />
}
```

### Server vs Client Components

```typescript
// Server Component (по умолчанию) — для данных
export default async function Page() {
  const data = await fetchData() // Прямой доступ к БД
  return <ClientComponent data={data} />
}

// Client Component — для интерактивности
'use client'
export function Button({ onClick }) {
  const [loading, setLoading] = useState(false)
  return <button onClick={onClick}>Click</button>
}
```

### Server Actions

```typescript
// app/_actions/create-product.ts
'use server'

import { revalidatePath } from 'next/cache'
import { auth } from '@/lib/auth'
import { headers } from 'next/headers'

export async function createProduct(formData: FormData) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) throw new Error('Unauthorized')

  await db.product.create({ data: { ... } })
  revalidatePath('/products')
}
```

### Metadata

```typescript
// Static
export const metadata: Metadata = {
  title: 'Каталог',
  description: 'Описание страницы',
}

// Dynamic
export async function generateMetadata({ params }): Promise<Metadata> {
  const product = await getProduct(params.id)
  return { title: product.name }
}
```

### Route Handlers (API)

```typescript
// app/api/products/route.ts
export async function GET(request: NextRequest) {
  const products = await db.product.findMany()
  return NextResponse.json(products)
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const product = await db.product.create({ data: body })
  return NextResponse.json(product, { status: 201 })
}
```

---

## File Conventions

| Файл            | Назначение              |
| --------------- | ----------------------- |
| `page.tsx`      | UI страницы             |
| `layout.tsx`    | Shared layout           |
| `loading.tsx`   | Loading UI (Suspense)   |
| `error.tsx`     | Error boundary          |
| `not-found.tsx` | 404 страница            |
| `route.ts`      | API endpoint            |
| `template.tsx`  | Re-render при навигации |
| `proxy.ts`      | Proxy (ex-middleware)   |

---

## Паттерны проекта

### Структура папок

```
app/
├── [locale]/           # i18n (premium-rosstil, kami)
│   ├── layout.tsx      # Провайдеры
│   ├── (auth)/         # Route group
│   │   └── sign-in/
│   ├── admin/
│   │   └── _actions/   # Server Actions
│   └── catalog/
│       ├── [id]/       # Dynamic route
│       └── _components/ # Локальные компоненты
├── _components/        # Shared компоненты
└── api/                # Route Handlers
```

### Провайдеры в Layout

```typescript
// app/[locale]/layout.tsx
import { auth } from '@/lib/auth'
import { headers } from 'next/headers'

export default async function Layout({ children }) {
  const session = await auth.api.getSession({ headers: await headers() })

  return (
    <html>
      <body>
        <ColorModeProvider>
          <ChakraProvider>
            <QueryProvider>
              {children}
            </QueryProvider>
          </ChakraProvider>
        </ColorModeProvider>
      </body>
    </html>
  )
}
```

### ZenStack в Server Components

```typescript
import { auth } from '@/lib/auth'
import { headers } from 'next/headers'

export default async function Page() {
  const session = await auth.api.getSession({ headers: await headers() })
  const db = getEnhancedPrisma(session?.user)

  // Access control автоматически применяется
  const products = await db.product.findMany()
}
```

---

## Ключевые команды

```bash
# Разработка
nx dev premium-rosstil          # Порт 3000
nx dev imot                      # Порт 3001

# Сборка
nx build premium-rosstil

# Очистка кэша
rm -rf apps/premium-rosstil/.next
nx reset
```

---

## Документация

| Раздел                                             | Описание                    |
| -------------------------------------------------- | --------------------------- |
| [app-router.md](reference/app-router.md)           | File conventions, routing   |
| [components.md](reference/components.md)           | Server vs Client Components |
| [data-fetching.md](reference/data-fetching.md)     | Server Actions, streaming   |
| [caching.md](reference/caching.md)                 | Кэширование, revalidation   |
| [configuration.md](reference/configuration.md)     | next.config.js, proxy.ts    |
| [optimization.md](reference/optimization.md)       | Images, fonts, bundle       |
| [metadata-seo.md](reference/metadata-seo.md)       | Metadata, OG, sitemap       |
| [troubleshooting.md](reference/troubleshooting.md) | Распространённые проблемы   |

---

## MCP инструменты

Используй `next-devtools` MCP для актуальной документации:

```bash
# Поиск в документации
nextjs_docs({ action: "search", query: "Server Actions" })

# Получение документа
nextjs_docs({ action: "get", path: "/docs/app/getting-started/fetching-data" })

# Подключение к dev серверу
nextjs_index()  # Найти запущенные серверы
nextjs_call({ port: "3000", toolName: "get_errors" })
```
