# Data Fetching и State Management

## Смешанный подход (React 19 + TanStack Query)

Этот проект использует **гибридную стратегию** для data fetching:

- **React 19 хуки** для простых форм и оптимистичных обновлений
- **TanStack Query** для сложных списков, кэширования и infinite scroll

## React 19 Хуки

### useOptimistic

**Когда использовать:**

- Простые оптимистичные обновления одного значения
- Like/favorite кнопки
- Количество товара в корзине
- Toggle состояния (on/off)

**Преимущества:**

- ✅ Встроенный в React (0 KB)
- ✅ Простой API
- ✅ Работает с Server Actions

**Недостатки:**

- ❌ Нет автоматической инвалидации кэша
- ❌ Нужен `router.refresh()` для обновления других компонентов
- ❌ Не подходит для списков

**Пример:**

```typescript
'use client'

import { useRouter } from 'next/navigation'
import { useOptimistic, useTransition } from 'react'

export function LikeButton({ postId, initialLikes }: { postId: string; initialLikes: number }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [optimisticLikes, setOptimisticLikes] = useOptimistic(initialLikes)

  const handleLike = () => {
    startTransition(async () => {
      setOptimisticLikes(optimisticLikes + 1)

      const result = await likePost(postId)

      if (result.success) {
        router.refresh()
      } else {
        router.refresh() // Вернёт реальное значение
      }
    })
  }

  return (
    <Button onClick={handleLike} disabled={isPending}>
      ❤️ {optimisticLikes}
    </Button>
  )
}
```

### useFormStatus

**Когда использовать:**

- Submit кнопки в формах
- Когда нужно показать loading state дочернему компоненту

См. подробнее в [Формы и валидация](/.claude/docs/forms.md#react-19-хуки-для-форм-и-оптимистичных-обновлений)

### useActionState

**Когда использовать:**

- Простые формы без сложной валидации
- Когда достаточно field-level ошибок

См. подробнее в [Формы и валидация](/.claude/docs/forms.md#react-19-хуки-для-форм-и-оптимистичных-обновлений)

---

## TanStack Query Хуки (ZenStack Generated)

### Генерируемые хуки

ZenStack автоматически генерирует TanStack Query хуки в `@/generated/hooks`:

```typescript
import {
  useCreateManyProduct,
  // Mutation хуки
  useCreateProduct,
  useDeleteProduct,
  // Query хуки
  useFindManyProduct,
  useFindUniqueProduct,
  useInfiniteFindManyProduct,
  useUpdateProduct,
} from '@/generated/hooks'
```

### Когда использовать TanStack Query

**✅ Используй для:**

- Списков с кэшированием (каталог, wishlist, orders)
- Infinite scroll (каталог товаров)
- Сложных dashboard данных
- Когда нужна автоматическая инвалидация кэша
- Множественных связанных мутаций

**❌ НЕ используй для:**

- Простых форм (используй React 19 `useActionState`)
- Одиночных оптимистичных обновлений (используй `useOptimistic`)
- Статических данных на сервере (используй Server Components)

### Настройка Provider

**ВАЖНО:** Используй `@letar/query-provider` — унифицированный провайдер с пресетами.

```typescript
// app/_components/providers/query-provider.tsx
'use client'

import { QueryProvider } from '@letar/query-provider'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryProvider preset="standard">
      {children}
    </QueryProvider>
  )
}
```

### Пресеты кэширования

| Пресет     | staleTime | gcTime  | Использование             |
| ---------- | --------- | ------- | ------------------------- |
| `realtime` | 5 сек     | 1 мин   | Метрики, алерты, чаты     |
| `standard` | 5 мин     | 30 мин  | Списки, каталоги, профили |
| `static`   | 30 мин    | 1 час   | Категории, справочники    |
| `offline`  | 5 мин     | 24 часа | PWA, e-commerce           |

### ZenStack интеграция

Для приложений с ZenStack используй `ZenStackQueryProvider`:

```typescript
import { ZenStackQueryProvider } from '@letar/query-provider'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ZenStackQueryProvider preset="standard" endpoint="/api/model">
      {children}
    </ZenStackQueryProvider>
  )
}
```

> Полная документация: [`libs/query-provider/README.md`](/libs/query-provider/README.md)

**Добавь в layout.tsx:**

```typescript
import { Providers } from '@/app/_components/providers/query-provider'

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <Providers>
          <ChakraProvider>
            {children}
          </ChakraProvider>
        </Providers>
      </body>
    </html>
  )
}
```

### Паттерн 1: Списки с кэшированием

**Когда:** Wishlist, Orders, Product Lists

```typescript
'use client'

import { useDeleteWishlistItem, useFindManyWishlistItem } from '@/generated/hooks'
import { Container, SimpleGrid, Spinner } from '@chakra-ui/react'

export default function WishlistPage() {
  const { data: items, isLoading } = useFindManyWishlistItem({
    include: {
      productVariant: {
        include: {
          product: true,
          images: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  const deleteItem = useDeleteWishlistItem({
    // ✅ Автоматически обновит список после удаления
    optimisticUpdate: true,
  })

  if (isLoading) return <Spinner />

  return (
    <Container>
      <SimpleGrid columns={{ base: 1, sm: 2, md: 3 }} gap={6}>
        {items?.map((item) => (
          <WishlistCard
            key={item.id}
            item={item}
            onDelete={() => deleteItem.mutate({ where: { id: item.id } })}
          />
        ))}
      </SimpleGrid>
    </Container>
  )
}
```

**Результат:**

- 💾 Данные кэшируются - повторные визиты мгновенные
- 🗑️ Удаление мгновенно обновляет список
- ⚡ Нет `router.refresh()` - обновляется только список

### Паттерн 2: Infinite Scroll

**Когда:** Каталог товаров, Лента блога

```typescript
'use client'

import { useInfiniteFindManyProduct } from '@/generated/hooks'
import { Button, SimpleGrid, Spinner } from '@chakra-ui/react'
import { useEffect } from 'react'
import { useInView } from 'react-intersection-observer'

export function CatalogInfinite({ categoryId }: { categoryId?: string }) {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useInfiniteFindManyProduct(
    {
      where: {
        ...(categoryId && { categoryId }),
        isActive: true,
      },
      include: {
        variants: {
          include: {
            images: { take: 1 },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    },
    {
      initialPageParam: 0,
      getNextPageParam: (lastPage, allPages) => {
        if (lastPage.length < 20) return undefined
        return allPages.length * 20
      },
    },
  )

  // Автозагрузка при скролле
  const { ref: loadMoreRef, inView } = useInView()

  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage()
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage])

  if (isLoading) return <Spinner size="xl" />

  const products = data?.pages.flat() ?? []

  return (
    <>
      <SimpleGrid columns={{ base: 1, sm: 2, md: 3, lg: 4 }} gap={6}>
        {products.map((product) => <ProductCard key={product.id} product={product} />)}
      </SimpleGrid>

      {hasNextPage && (
        <Box ref={loadMoreRef} py={8} textAlign="center">
          {isFetchingNextPage ? <Spinner /> : (
            <Button onClick={() => fetchNextPage()} variant="outline">
              Загрузить ещё
            </Button>
          )}
        </Box>
      )}
    </>
  )
}
```

**Установка зависимости:**

```bash
bun add react-intersection-observer
```

**Результат:**

- 📜 Бесконечный скролл вместо пагинации
- 💾 Все загруженные страницы кэшируются
- ⚡ Мгновенная загрузка при скролле назад

### Паттерн 3: Оптимистичные обновления с автоинвалидацией

**Когда:** Корзина, Like/Favorite с зависимыми данными

```typescript
'use client'

import { toaster } from '@/app/_components/ui/toaster'
import { useDeleteCartItem, useUpdateCartItem } from '@/generated/hooks'

export function CartItemCard({ item }) {
  const updateCart = useUpdateCartItem({
    optimisticUpdate: true,
  })

  const deleteCart = useDeleteCartItem({
    optimisticUpdate: true,
  })

  const handleUpdateQuantity = (newQuantity: number) => {
    updateCart.mutate(
      {
        where: { id: item.id },
        data: { quantity: newQuantity },
      },
      {
        onSuccess: () => {
          toaster.success({ title: 'Обновлено' })
          // ✅ TanStack Query автоматически обновит связанные запросы
        },
        onError: (error) => {
          toaster.error({ title: 'Ошибка', description: error.message })
        },
      },
    )
  }

  return (
    <Box>
      <NumberInput
        value={item.quantity}
        onChange={(val) => handleUpdateQuantity(val)}
        disabled={updateCart.isPending}
      />

      <IconButton
        onClick={() => deleteCart.mutate({ where: { id: item.id } })}
        loading={deleteCart.isPending}
      >
        <FiTrash2 />
      </IconButton>
    </Box>
  )
}
```

**Результат:**

- ⚡ UI обновляется мгновенно
- 🔄 Автоматическая инвалидация связанных запросов
- ❌ При ошибке автоматический откат изменений

### Паттерн 3.5: Последовательные транзакции с фронта (ZenStack v3.7+)

> ⚠️ **TODO — внедрить проактивно**, особенно в `studio` и в новом приложении. `$transaction`
> в ORM-клиенте ZenStack v3 не поддерживается (см. [database.md](/.claude/docs/database.md#паттерн-отсутствие-transaction)
> — только последовательные операции без атомарности). `useSequential` закрывает именно эту дыру
> для клиентских мутаций: несколько связанных операций уходят на сервер и выполняются одним запросом.

**Когда:** нужно выполнить несколько связанных мутаций одним запросом с фронта — вместо ручного
`await`-чейна из нескольких `.mutate()` с проверкой каждого результата. Кандидаты в `studio`:
создание брони + резервирование слота, оформление заказа + списание остатка, любой мульти-модельный
create/update, где частичный успех недопустим.

```typescript
'use client'

import { useClientQueries } from '@/generated/hooks'
import { schema } from '@/generated/schema'

export function BookingForm() {
  const client = useClientQueries(schema)
  const tx = client.$transaction.useSequential()

  const handleSubmit = () => {
    tx.mutate([
      { model: 'Booking', op: 'create', args: { data: { slotId, userId } } },
      { model: 'Slot', op: 'update', args: { where: { id: slotId }, data: { isBooked: true } } },
    ])
  }

  return <Button onClick={handleSubmit} loading={tx.isPending}>Забронировать</Button>
}
```

**Отличие от нескольких независимых `.mutate()`:** операции выполняются последовательно на сервере
в рамках одного запроса — при ошибке любой из них весь запрос падает, а не оставляет систему в
промежуточном состоянии (первая мутация прошла, вторая нет).

---

## Виртуализация списков

Виртуализация — техника рендеринга только видимых элементов списка. Используется для оптимизации производительности при работе с большими наборами данных.

### Когда использовать

| Подход              | Когда использовать                              | Примеры                            |
| ------------------- | ----------------------------------------------- | ---------------------------------- |
| **Infinite Scroll** | Постепенная загрузка данных с сервера           | Каталог товаров, лента новостей    |
| **Виртуализация**   | Все данные уже загружены, много элементов в DOM | Таблицы логов, длинные справочники |
| **Оба вместе**      | Большие данные + постепенная загрузка           | Бесконечные таблицы, чаты          |

### Критерии выбора

**Используй Infinite Scroll (текущий подход), если:**

- ✅ Данные загружаются постепенно с сервера
- ✅ Элементы имеют переменную высоту
- ✅ Важно SEO (контент доступен для индексации)
- ✅ Список до 500 элементов в DOM

**Добавь виртуализацию, если:**

- ✅ В DOM >500-1000 элементов одновременно
- ✅ Элементы имеют фиксированную или предсказуемую высоту
- ✅ Наблюдаются проблемы с производительностью при скролле
- ✅ Все данные уже загружены (или загружаются большими порциями)

### Паттерн 4: Базовая виртуализация

**Когда:** Отображение большого списка с фиксированной высотой элементов (логи, справочники)

```typescript
'use client'

import { useFindManyApiLog } from '@/generated/hooks'
import { Box, Spinner, Text } from '@chakra-ui/react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { useRef } from 'react'

const ROW_HEIGHT = 48 // Фиксированная высота строки

export function ApiLogsList() {
  const parentRef = useRef<HTMLDivElement>(null)

  const { data: logs, isLoading } = useFindManyApiLog({
    orderBy: { createdAt: 'desc' },
    take: 1000, // Загружаем много данных сразу
  })

  const rowVirtualizer = useVirtualizer({
    count: logs?.length ?? 0,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 10, // Рендерим 10 элементов за пределами viewport
  })

  if (isLoading) return <Spinner />

  return (
    <Box
      ref={parentRef}
      height="500px"
      overflowY="auto"
      borderWidth="1px"
      borderRadius="md"
    >
      <Box
        position="relative"
        width="100%"
        height={`${rowVirtualizer.getTotalSize()}px`}
      >
        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
          const log = logs![virtualRow.index]
          return (
            <Box
              key={log.id}
              position="absolute"
              top={0}
              left={0}
              width="100%"
              height={`${virtualRow.size}px`}
              transform={`translateY(${virtualRow.start}px)`}
              px={4}
              display="flex"
              alignItems="center"
              borderBottomWidth="1px"
              bg={virtualRow.index % 2 ? 'bg.muted' : 'bg'}
            >
              <Text fontSize="sm" truncate>
                {log.method} {log.endpoint} — {log.statusCode}
              </Text>
            </Box>
          )
        })}
      </Box>
    </Box>
  )
}
```

**Результат:**

- 🚀 Рендерятся только видимые строки (~20-30 вместо 1000)
- ⚡ Мгновенный скролл без лагов
- 💾 Экономия памяти браузера

### Паттерн 5: Виртуализация + Infinite Scroll

**Когда:** Огромные данные, которые нужно загружать постепенно И виртуализировать (логи API, история чата)

```typescript
'use client'

import { useInfiniteFindManyApiLog } from '@/generated/hooks'
import { Box, Spinner, Text } from '@chakra-ui/react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { useEffect, useMemo, useRef } from 'react'

const ROW_HEIGHT = 48
const PAGE_SIZE = 100

export function ApiLogsVirtualInfinite() {
  const parentRef = useRef<HTMLDivElement>(null)

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useInfiniteFindManyApiLog(
    {
      orderBy: { createdAt: 'desc' },
      take: PAGE_SIZE,
    },
    {
      getNextPageParam: (lastPage, allPages) => {
        if (lastPage.length < PAGE_SIZE) return undefined
        return allPages.length * PAGE_SIZE
      },
    },
  )

  // Объединяем все страницы
  const allLogs = useMemo(() => data?.pages.flat() ?? [], [data])

  // Виртуализатор: +1 для loader row если есть следующая страница
  const rowVirtualizer = useVirtualizer({
    count: hasNextPage ? allLogs.length + 1 : allLogs.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 10,
  })

  // Автозагрузка при скролле к концу
  useEffect(() => {
    const virtualItems = rowVirtualizer.getVirtualItems()
    const lastItem = virtualItems[virtualItems.length - 1]

    if (!lastItem) return

    // Если видим последний элемент и есть ещё данные — загружаем
    if (
      lastItem.index >= allLogs.length - 1
      && hasNextPage
      && !isFetchingNextPage
    ) {
      fetchNextPage()
    }
  }, [
    rowVirtualizer.getVirtualItems(),
    hasNextPage,
    isFetchingNextPage,
    allLogs.length,
    fetchNextPage,
  ])

  if (isLoading) return <Spinner size="xl" />

  return (
    <Box
      ref={parentRef}
      height="600px"
      overflowY="auto"
      borderWidth="1px"
      borderRadius="md"
    >
      <Box
        position="relative"
        width="100%"
        height={`${rowVirtualizer.getTotalSize()}px`}
      >
        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
          const isLoaderRow = virtualRow.index > allLogs.length - 1

          if (isLoaderRow) {
            return (
              <Box
                key="loader"
                position="absolute"
                top={0}
                left={0}
                width="100%"
                height={`${virtualRow.size}px`}
                transform={`translateY(${virtualRow.start}px)`}
                display="flex"
                alignItems="center"
                justifyContent="center"
              >
                {hasNextPage ? <Spinner size="sm" /> : <Text color="fg.muted">Больше данных нет</Text>}
              </Box>
            )
          }

          const log = allLogs[virtualRow.index]
          return (
            <Box
              key={log.id}
              position="absolute"
              top={0}
              left={0}
              width="100%"
              height={`${virtualRow.size}px`}
              transform={`translateY(${virtualRow.start}px)`}
              px={4}
              display="flex"
              alignItems="center"
              borderBottomWidth="1px"
              bg={virtualRow.index % 2 ? 'bg.muted' : 'bg'}
            >
              <Text fontSize="sm" truncate>
                {log.method} {log.endpoint} — {log.statusCode}
              </Text>
            </Box>
          )
        })}
      </Box>
    </Box>
  )
}
```

**Результат:**

- 📜 Бесконечная загрузка данных с сервера
- 🚀 Виртуализация для мгновенного скролла
- ⚡ Комбинация лучших практик для огромных списков

### Паттерн 6: Горизонтальная виртуализация

**Когда:** Горизонтальные карусели, таймлайны с большим количеством элементов

```typescript
'use client'

import { Box, Image } from '@chakra-ui/react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { useRef } from 'react'

const ITEM_WIDTH = 200

interface Props {
  images: Array<{ id: string; url: string; alt: string }>
}

export function VirtualCarousel({ images }: Props) {
  const parentRef = useRef<HTMLDivElement>(null)

  const columnVirtualizer = useVirtualizer({
    horizontal: true,
    count: images.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ITEM_WIDTH,
    overscan: 3,
  })

  return (
    <Box
      ref={parentRef}
      width="100%"
      height="150px"
      overflowX="auto"
      overflowY="hidden"
    >
      <Box
        position="relative"
        height="100%"
        width={`${columnVirtualizer.getTotalSize()}px`}
      >
        {columnVirtualizer.getVirtualItems().map((virtualColumn) => {
          const image = images[virtualColumn.index]
          return (
            <Box
              key={image.id}
              position="absolute"
              top={0}
              left={0}
              height="100%"
              width={`${virtualColumn.size}px`}
              transform={`translateX(${virtualColumn.start}px)`}
              p={2}
            >
              <Image
                src={image.url}
                alt={image.alt}
                objectFit="cover"
                height="100%"
                width="100%"
                borderRadius="md"
              />
            </Box>
          )
        })}
      </Box>
    </Box>
  )
}
```

### Сравнительная таблица: Infinite Scroll vs Виртуализация

| Критерий                       | Infinite Scroll    | Виртуализация  | Оба вместе     |
| ------------------------------ | ------------------ | -------------- | -------------- |
| **Загрузка данных**            | Постепенная        | Всё сразу      | Постепенная    |
| **DOM элементы**               | Накапливаются      | Только видимые | Только видимые |
| **Память**                     | Растёт со скроллом | Константа      | Константа      |
| **SEO**                        | ✅ Частичное       | ❌ Нет         | ❌ Нет         |
| **Переменная высота**          | ✅ Просто          | ⚠️ Сложнее      | ⚠️ Сложнее      |
| **Производительность скролла** | ⚠️ Деградирует      | ✅ Константа   | ✅ Константа   |
| **Сложность реализации**       | Низкая             | Средняя        | Высокая        |

### Чеклист: когда добавлять виртуализацию

- [ ] В списке >500 элементов одновременно
- [ ] Пользователи жалуются на лаги при скролле
- [ ] React DevTools показывает много DOM элементов
- [ ] Lighthouse указывает на проблемы с DOM size
- [ ] Элементы имеют фиксированную или предсказуемую высоту

### API useVirtualizer

```typescript
import { useVirtualizer } from '@tanstack/react-virtual'

const virtualizer = useVirtualizer({
  // Обязательные
  count: items.length, // Количество элементов
  getScrollElement: () => parentRef.current, // Scroll container
  estimateSize: () => 48, // Высота элемента (или функция)

  // Опциональные
  horizontal: false, // Горизонтальная виртуализация
  overscan: 5, // Элементов за пределами viewport
  paddingStart: 0, // Отступ сверху/слева
  paddingEnd: 0, // Отступ снизу/справа
  scrollMargin: 0, // Margin для scroll container
  gap: 0, // Gap между элементами
  lanes: 1, // Количество колонок (masonry)
})

// Методы
virtualizer.getVirtualItems() // Массив видимых элементов
virtualizer.getTotalSize() // Общий размер списка
virtualizer.scrollToIndex(index) // Прокрутить к элементу
virtualizer.scrollToOffset(offset) // Прокрутить к позиции
virtualizer.measureElement(el) // Измерить элемент (ref callback)
```

### Gotchas виртуализации

#### Не используй виртуализацию для маленьких списков

```typescript
// ❌ ПЛОХО — оверхед больше пользы
const virtualizer = useVirtualizer({ count: 20, ... })

// ✅ ХОРОШО — обычный рендеринг
{items.map(item => <Card key={item.id} {...item} />)}
```

#### Не забывай про position: relative на контейнере

```typescript
// ❌ ПЛОХО — элементы не позиционируются правильно
<Box height={virtualizer.getTotalSize()}>
  {virtualItems.map(...)}
</Box>

// ✅ ХОРОШО — position: relative обязателен
<Box position="relative" height={virtualizer.getTotalSize()}>
  {virtualItems.map(...)}
</Box>
```

#### Не используй virtualRow.index как key для loader row

```typescript
// ❌ ПЛОХО — конфликт ключей
{
  virtualItems.map((row) => <Box key={row.index}>...</Box>)
}

// ✅ ХОРОШО — уникальный ключ для loader
{
  virtualItems.map((row) => {
    const isLoader = row.index > items.length - 1
    return (
      <Box key={isLoader ? 'loader' : items[row.index].id}>
        ...
      </Box>
    )
  })
}
```

---

## Сравнение подходов

| Критерий                     | React 19 useOptimistic         | TanStack Query          |
| ---------------------------- | ------------------------------ | ----------------------- |
| **Bundle size**              | 0 KB (встроенный)              | ~50 KB                  |
| **Кэширование**              | ❌ Нет                         | ✅ Автоматическое       |
| **Инвалидация**              | ❌ Ручная (`router.refresh()`) | ✅ Автоматическая       |
| **Оптимистичные обновления** | ✅ Простые                     | ✅ Сложные + откат      |
| **Infinite scroll**          | ❌ Нет                         | ✅ Встроенная поддержка |
| **DevTools**                 | ❌ Нет                         | ✅ React Query DevTools |
| **Простота для форм**        | ✅ Очень простой               | ⚠️ Больше кода           |
| **Offline support**          | ❌ Нет                         | ✅ Через persist        |

---

## Рекомендации по выбору

### Используй React 19 хуки для:

1. **Простых форм:**

   ```typescript
   const [state, formAction, isPending] = useActionState(signInAction, {})
   ```

2. **Одиночных оптимистичных обновлений:**

   ```typescript
   const [optimisticLikes, setOptimisticLikes] = useOptimistic(likes)
   ```

3. **Submit кнопок:**
   ```typescript
   function SubmitButton() {
     const { pending } = useFormStatus()
     return <Button loading={pending}>Save</Button>
   }
   ```

### Используй TanStack Query для:

1. **Списков с кэшированием:**

   ```typescript
   const { data: products } = useFindManyProduct()
   ```

2. **Infinite scroll:**

   ```typescript
   const { data, fetchNextPage } = useInfiniteFindManyProduct()
   ```

3. **Сложных dashboard данных:**

   ```typescript
   const { data: stats } = useFindManyOrder({
     where: { status: 'COMPLETED' },
     select: { total: true, createdAt: true },
   })
   ```

4. **Множественных связанных мутаций:**
   ```typescript
   const updateProduct = useUpdateProduct()
   const createVariant = useCreateVariant()
   // Автоматическая инвалидация связанных queries
   ```

---

## Gotchas и частые ошибки

### ❌ Не используй TanStack Query для всего

```typescript
// ❌ ПЛОХО - простая форма не нуждается в TanStack Query
const mutation = useCreateUser()
<form onSubmit={(e) => { /* используй mutation */ }}>

// ✅ ХОРОШО - используй React 19
const [state, formAction] = useActionState(createUser, {})
<form action={formAction}>
```

### ❌ Не используй useOptimistic для списков

```typescript
// ❌ ПЛОХО - нет автоинвалидации, нужен router.refresh()
const [optimisticItems, setOptimisticItems] = useOptimistic(items)

// ✅ ХОРОШО - TanStack Query автоматически обновит список
const { data: items } = useFindManyProduct()
const deleteProduct = useDeleteProduct({ optimisticUpdate: true })
```

### ✅ Комбинируй подходы

```typescript
// ✅ ОТЛИЧНО - гибридный подход
export function ProductPage({ product }) {
  // React 19 для простой like кнопки
  const [optimisticLikes, setOptimisticLikes] = useOptimistic(product.likes)

  // TanStack Query для списка комментариев
  const { data: comments } = useFindManyComment({
    where: { productId: product.id },
  })

  return (
    <>
      <LikeButton likes={optimisticLikes} onLike={() => setOptimisticLikes(optimisticLikes + 1)} />
      <CommentsList comments={comments} />
    </>
  )
}
```

---

## Эталонные примеры

- **React 19 useOptimistic:** Количество в корзине (простое значение)
- **React 19 useActionState:** Формы signin/signup (простая валидация)
- **TanStack Query:** Wishlist страница (список с кэшированием)
- **TanStack Query Infinite:** Каталог товаров (infinite scroll)
- **Гибрид:** Dashboard (useActionState для фильтров + useQuery для данных)
