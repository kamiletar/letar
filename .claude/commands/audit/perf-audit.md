# Perf Audit - Аудит производительности

Проведи аудит производительности приложения.

## Когда использовать

- Приложение загружается медленно
- UI лагает при взаимодействии
- Запросы к API/БД медленные
- Перед релизом (профилактика)

## Области аудита

### 1. Bundle Size

```bash
# Анализ размера бандла
nx build <app>
# Смотри .next/analyze/ или dist/

# Или через webpack-bundle-analyzer
ANALYZE=true nx build <app>
```

**Проверить:**

- [ ] Нет дублирования зависимостей
- [ ] Tree-shaking работает
- [ ] Динамические импорты для тяжёлых компонентов

### 2. React Rendering

**React DevTools Profiler:**

1. Открой React DevTools → Profiler
2. Запиши сессию
3. Найди долгие рендеры (>16ms)

**Проверить:**

- [ ] Нет лишних ререндеров
- [ ] `useMemo`/`useCallback` для тяжёлых вычислений
- [ ] `React.memo` для чистых компонентов
- [ ] Виртуализация длинных списков

### 3. Lighthouse

```bash
# В Chrome DevTools → Lighthouse
# Или CLI:
npx lighthouse https://localhost:3000 --view
```

**Метрики:**

| Метрика                        | Цель   |
| ------------------------------ | ------ |
| FCP (First Contentful Paint)   | < 1.8s |
| LCP (Largest Contentful Paint) | < 2.5s |
| TTI (Time to Interactive)      | < 3.8s |
| CLS (Cumulative Layout Shift)  | < 0.1  |

### 4. Database Queries

```typescript
// Включить логирование запросов в PrismaClient
const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
})
```

**Проверить:**

- [ ] Нет N+1 запросов (используй include/select)
- [ ] Индексы на часто фильтруемых полях
- [ ] Пагинация для больших списков

### 5. Network

**Chrome DevTools → Network:**

- [ ] Сжатие (gzip/brotli) включено
- [ ] Кэширование статики
- [ ] Нет waterfall блокировок
- [ ] Изображения оптимизированы (WebP, lazy loading)

## Оптимизации

### Next.js

```tsx
// Динамический импорт
const HeavyComponent = dynamic(() => import('./HeavyComponent'), {
  loading: () => <Spinner />,
  ssr: false,
})

// Оптимизация изображений
import Image from 'next/image'
<Image src={src} width={800} height={600} loading="lazy" />
```

### React

```tsx
// Мемоизация
const MemoizedList = React.memo(function List({ items }) {
  return items.map((item) => <Item key={item.id} {...item} />)
})

// Отложенные вычисления
const expensiveValue = useMemo(() => compute(data), [data])
```

### Prisma/ZenStack

```typescript
// Выбирай только нужные поля
const users = await db.user.findMany({
  select: {
    id: true,
    name: true,
    // НЕ загружать тяжёлые поля
  },
})

// Include вместо отдельных запросов
const order = await db.order.findUnique({
  where: { id },
  include: {
    items: true,
    user: true,
  },
})
```

## Чеклист

- [ ] Bundle size проанализирован
- [ ] React Profiler запущен
- [ ] Lighthouse метрики проверены
- [ ] Slow queries найдены и оптимизированы
- [ ] Критичные проблемы исправлены

## Результат

Выведи отчёт:

- Найденные проблемы
- Рекомендации по оптимизации
- Приоритет исправлений
