---
paths: 'apps/**/page.tsx, apps/**/layout.tsx, apps/**/_components/**'
---

# Правила производительности

## Bundle Size

```tsx
// ✅ Динамический импорт для тяжёлых компонентов
import dynamic from 'next/dynamic'

const HeavyChart = dynamic(() => import('./HeavyChart'), {
  loading: () => <Spinner />,
  ssr: false,
})

// ✅ Именованные экспорты для tree-shaking
import { Button } from '@chakra-ui/react' // ✅
import * as Chakra from '@chakra-ui/react' // ❌ Тянет весь пакет
```

## Изображения

```tsx
// ✅ Next.js Image — автооптимизация
import Image from 'next/image'
<Image
  src="/hero.jpg"
  width={800}
  height={600}
  loading="lazy" // Ленивая загрузка
  placeholder="blur" // Placeholder пока грузится
  blurDataURL={blurHash}
/>
```

## React оптимизации

```tsx
// ✅ Мемоизация тяжёлых вычислений
const expensiveValue = useMemo(() => {
  return items.filter(/* ... */).map() /* ... */
}, [items])

// ✅ Мемоизация колбэков
const handleClick = useCallback(() => {
  doSomething(id)
}, [id])

// ✅ React.memo для чистых компонентов
const ProductCard = React.memo(function ProductCard({ product }) {
  return <Box>{product.name}</Box>
})
```

## База данных

```typescript
// ✅ Выбирай только нужные поля
const users = await db.user.findMany({
  select: {
    id: true,
    name: true,
    // НЕ загружать тяжёлые поля (avatar, bio)
  },
})

// ✅ Include вместо N+1 запросов
const order = await db.order.findUnique({
  where: { id },
  include: {
    items: true,
    user: { select: { id: true, name: true } },
  },
})

// ✅ Пагинация для больших списков
const products = await db.product.findMany({
  take: 20,
  skip: (page - 1) * 20,
  orderBy: { createdAt: 'desc' },
})
```

## Метрики (Lighthouse)

| Метрика                        | Цель   |
| ------------------------------ | ------ |
| FCP (First Contentful Paint)   | < 1.8s |
| LCP (Largest Contentful Paint) | < 2.5s |
| TTI (Time to Interactive)      | < 3.8s |
| CLS (Cumulative Layout Shift)  | < 0.1  |

## Чеклист

- [ ] Тяжёлые компоненты через `dynamic()`
- [ ] Изображения через `next/image`
- [ ] `useMemo`/`useCallback` для тяжёлых операций
- [ ] `select` в Prisma запросах
- [ ] Пагинация для списков
- [ ] Нет N+1 запросов (используй `include`)
