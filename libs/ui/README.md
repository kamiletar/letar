# @letar/ui

Shared UI компоненты для приложений Letar.

## Установка

Библиотека уже включена в монорепозиторий.

```typescript
import { ConfirmDialog, RatingStars, TopLoader } from '@letar/ui'
```

## Компоненты

### TopLoader

Индикатор загрузки страницы в стиле YouTube.

```tsx
import { TopLoader } from '@letar/ui'
;<TopLoader />
```

### ConfirmDialog

Диалог подтверждения действия.

```tsx
import { ConfirmDialog } from '@letar/ui'
;<ConfirmDialog
  open={isOpen}
  onOpenChange={setIsOpen}
  title="Удалить запись?"
  description="Это действие нельзя отменить"
  onConfirm={handleDelete}
/>
```

### RatingStars / RatingDisplay

Компоненты для отображения рейтинга.

```tsx
import { RatingDisplay, RatingStars } from '@letar/ui'

// Интерактивные звёзды
<RatingStars value={rating} onChange={setRating} />

// Только отображение
<RatingDisplay value={4.5} />
```

### FilterPanel

Панель фильтров с URL-синхронизацией.

```tsx
import { FilterField, FilterPanel, FilterRow } from '@letar/ui'
;<FilterPanel>
  <FilterRow>
    <FilterField name="status" label="Статус">
      <Select options={statusOptions} />
    </FilterField>
  </FilterRow>
</FilterPanel>
```

### StatCard / RoleStat

Карточки статистики для дашбордов.

```tsx
import { RoleStat, StatCard } from '@letar/ui'

<StatCard title="Пользователи" value={1234} />
<RoleStat role="ADMIN" count={5} />
```

### OptimizedAvatar

Оптимизированный аватар с lazy loading.

```tsx
import { OptimizedAvatar } from '@letar/ui'
;<OptimizedAvatar src="/avatar.jpg" name="Иван" />
```

### ReviewCard

Карточка отзыва.

```tsx
import { ReviewCard } from '@letar/ui'
;<ReviewCard review={{ text: 'Отличный сервис!', rating: 5 }} author={{ name: 'Анна', avatar: '/anna.jpg' }} />
```

## Хуки

### useServiceWorker

Хук для работы с Service Worker.

```tsx
import { useServiceWorker } from '@letar/ui'

const { registration, updateAvailable, update } = useServiceWorker()
```

### useUrlFilters

Хук для синхронизации фильтров с URL.

```tsx
import { useUrlFilters } from '@letar/ui'

const { filters, setFilter, resetFilters } = useUrlFilters({
  defaultFilters: { status: 'active' },
})
```

## Команды

```bash
nx build ui
nx test ui
nx lint ui
```
