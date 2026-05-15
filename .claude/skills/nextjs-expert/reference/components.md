# Server vs Client Components

React Server Components — основа архитектуры Next.js 16.

---

## Быстрое сравнение

| Критерий                 | Server Component | Client Component   |
| ------------------------ | ---------------- | ------------------ |
| Директива                | По умолчанию     | `'use client'`     |
| Где выполняется          | Сервер           | Сервер + Клиент    |
| State (useState)         | ❌               | ✅                 |
| Хуки жизненного цикла    | ❌               | ✅                 |
| Event handlers           | ❌               | ✅                 |
| Browser APIs             | ❌               | ✅                 |
| async/await в компоненте | ✅               | ❌                 |
| Прямой доступ к БД       | ✅               | ❌                 |
| Secrets (API keys)       | ✅               | ❌                 |
| Bundle size              | 0 KB             | Добавляет в bundle |

---

## Server Components

По умолчанию все компоненты в App Router — Server Components.

### Когда использовать

- Fetch данных из БД или API
- Доступ к secrets и API keys
- Тяжёлые зависимости (markdown, syntax highlighting)
- Статический контент

### Пример

```typescript
// app/products/page.tsx — Server Component по умолчанию
import { auth } from '@/lib/auth'
import { getEnhancedPrisma } from '@/lib/db'
import { ProductCard } from './_components/product-card'

export default async function ProductsPage() {
  const session = await auth()
  const db = getEnhancedPrisma(session?.user)

  // Прямой доступ к БД — безопасно, код не попадает в bundle
  const products = await db.product.findMany({
    where: { isPublished: true },
    include: { category: true },
  })

  return (
    <Grid columns={{ base: 1, md: 2, lg: 3 }} gap={4}>
      {products.map((product) => <ProductCard key={product.id} product={product} />)}
    </Grid>
  )
}
```

### Что можно делать

```typescript
// ✅ async/await
export default async function Page() {
  const data = await fetchData()
}

// ✅ Прямой доступ к файловой системе
import fs from 'fs'
const content = fs.readFileSync('data.json', 'utf-8')

// ✅ Использование secrets
const apiKey = process.env.SECRET_API_KEY

// ✅ Тяжёлые библиотеки (не попадают в client bundle)
import { marked } from 'marked'
import { highlight } from 'prismjs'
```

---

## Client Components

Добавь `'use client'` в начало файла для интерактивности.

### Когда использовать

- State и event handlers (useState, onClick)
- Lifecycle hooks (useEffect)
- Browser APIs (localStorage, window)
- Third-party libraries для браузера

### Пример

```typescript
// app/products/_components/add-to-cart-button.tsx
'use client'

import { Button } from '@chakra-ui/react'
import { useState, useTransition } from 'react'
import { addToCart } from '../_actions/cart'

interface Props {
  productId: string
}

export function AddToCartButton({ productId }: Props) {
  const [isPending, startTransition] = useTransition()
  const [added, setAdded] = useState(false)

  const handleClick = () => {
    startTransition(async () => {
      await addToCart(productId)
      setAdded(true)
    })
  }

  return (
    <Button
      onClick={handleClick}
      loading={isPending}
      colorPalette={added ? 'green' : 'blue'}
    >
      {added ? 'В корзине' : 'В корзину'}
    </Button>
  )
}
```

### Что можно делать

```typescript
'use client'

// ✅ State
const [count, setCount] = useState(0)

// ✅ Effects
useEffect(() => {
  document.title = 'New Title'
}, [])

// ✅ Event handlers
<button onClick={() => setCount(c => c + 1)}>

// ✅ Browser APIs
const theme = localStorage.getItem('theme')
const width = window.innerWidth

// ✅ Custom hooks
const { data } = useQuery({ queryKey: ['products'] })
```

---

## Паттерны композиции

### 1. Server → Client через props

```typescript
// app/products/page.tsx (Server)
export default async function Page() {
  const products = await db.product.findMany()

  // Передаём данные как props
  return <ProductFilters products={products} />
}

// app/products/_components/product-filters.tsx (Client)
'use client'

interface Props {
  products: Product[]
}

export function ProductFilters({ products }: Props) {
  const [filter, setFilter] = useState('')

  const filtered = products.filter((p) => p.name.toLowerCase().includes(filter))

  return (
    <>
      <Input value={filter} onChange={(e) => setFilter(e.target.value)} />
      <ProductList products={filtered} />
    </>
  )
}
```

### 2. Client children для Server Components

```typescript
// app/dashboard/layout.tsx (Server)
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <ClientSidebar>
      {children} {/* Server Components могут быть children */}
    </ClientSidebar>
  )
}

// components/client-sidebar.tsx (Client)
'use client'

export function ClientSidebar({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(true)

  return (
    <Flex>
      <Sidebar isOpen={isOpen} onToggle={() => setIsOpen(!isOpen)} />
      <Box flex={1}>{children}</Box>
    </Flex>
  )
}
```

### 3. Context Providers в Layout

```typescript
// app/[locale]/layout.tsx (Server)
export default async function Layout({ children }) {
  const session = await auth()

  return (
    <Providers session={session}>
      {children}
    </Providers>
  )
}

// components/providers.tsx (Client)
'use client'

export function Providers({
  children,
  session,
}: {
  children: React.ReactNode
  session: Session | null
}) {
  return (
    <SessionProvider session={session}>
      <QueryProvider>
        <ChakraProvider>
          {children}
        </ChakraProvider>
      </QueryProvider>
    </SessionProvider>
  )
}
```

### 4. Обёртка third-party компонентов

```typescript
// components/chart-wrapper.tsx (Client)
'use client'

import { Chart } from 'chart.js'

// Обернули библиотеку которая требует browser APIs
export function ChartWrapper(props: ChartProps) {
  return <Chart {...props} />
}
```

---

## Границы 'use client'

### Как работает

```
app/
└── page.tsx          # Server
    └── ProductList   # Server (импортирован без 'use client')
        └── Filters   # Client ('use client')
            └── Input # Client (внутри Client boundary)
```

`'use client'` создаёт границу — все импорты внутри становятся Client.

### ❌ Частые ошибки

```typescript
// ❌ ОШИБКА: useState в Server Component
export default function Page() {
  const [count, setCount] = useState(0)
  return <div>{count}</div>
}

// ❌ ОШИБКА: useEffect в Server Component
export default function Page() {
  useEffect(() => {
    console.log('mounted')
  }, [])
}

// ❌ ОШИБКА: onClick в Server Component
export default function Page() {
  return <button onClick={() => alert('hi')}>Click</button>
}
```

### ✅ Решения

```typescript
// ✅ Вынести в Client Component
// components/counter.tsx
'use client'
export function Counter() {
  const [count, setCount] = useState(0)
  return <button onClick={() => setCount((c) => c + 1)}>{count}</button>
}

// app/page.tsx (Server)
import { Counter } from '@/components/counter'
export default function Page() {
  return <Counter />
}
```

---

## Serialization

Props между Server и Client должны быть сериализуемые.

### ✅ Сериализуемые

- Primitives: string, number, boolean, null, undefined
- Arrays и Objects с сериализуемыми значениями
- Date (преобразуется в строку)
- Map, Set (с сериализуемыми значениями)

### ❌ Не сериализуемые

```typescript
// ❌ Функции
<ClientComponent onClick={() => {}} />

// ❌ Classes
<ClientComponent user={new User()} />

// ❌ Symbols
<ClientComponent id={Symbol('id')} />

// ❌ Streams, Promises (напрямую)
<ClientComponent stream={readableStream} />
```

### ✅ Решения

```typescript
// ✅ Передавать данные, не функции
<ClientComponent productId={product.id} />

// ✅ Сериализовать объекты
<ClientComponent user={JSON.parse(JSON.stringify(user))} />

// ✅ Для действий — Server Actions
<ClientComponent action={serverAction} />
```

---

## Rendering Strategies

### Server Components

1. **Static** — рендерятся при build
2. **Dynamic** — рендерятся при каждом запросе

```typescript
// Force static
export const dynamic = 'force-static'

// Force dynamic (если используешь cookies, headers, searchParams)
export const dynamic = 'force-dynamic'
```

### Client Components

1. **SSR** — сначала на сервере, потом hydration
2. **CSR** — только на клиенте (после dynamic import)

```typescript
// Отключить SSR для компонента
import dynamic from 'next/dynamic'

const NoSSRComponent = dynamic(() => import('./component'), { ssr: false })
```

---

## Best Practices

### 1. Server Components по умолчанию

```typescript
// ✅ Начинай с Server Component
export default async function Page() {
  const data = await fetchData()
  return <View data={data} />
}

// Добавляй 'use client' только когда нужна интерактивность
```

### 2. Минимизируй Client boundary

```typescript
// ❌ Вся страница Client
'use client'
export default function Page() {
  const [filter, setFilter] = useState('')
  const { data } = useQuery(...)
  return <BigComponent data={data} filter={filter} />
}

// ✅ Только интерактивная часть Client
export default async function Page() {
  const data = await fetchData()
  return (
    <>
      <ServerHeader />
      <InteractiveFilter data={data} /> {/* только это Client */}
      <ServerFooter />
    </>
  )
}
```

### 3. Co-location

```
app/products/
├── page.tsx                # Server Component
├── _components/            # Локальные компоненты
│   ├── product-card.tsx    # Server
│   ├── filters.tsx         # Client
│   └── add-to-cart.tsx     # Client
└── _actions/               # Server Actions
    └── cart.ts
```

---

## См. также

- [data-fetching.md](data-fetching.md) — Загрузка данных
- [app-router.md](app-router.md) — Структура роутов
- [troubleshooting.md](troubleshooting.md) — Ошибки hydration
