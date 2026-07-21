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

### StickyActionBar

Липкая панель основного действия внизу экрана. Решает системную проблему: основная
CTA («Начать», «Отправить», «Продолжить») уходит под фолд на длинных интро/формах и не
видна без скролла. `position: sticky; bottom: 0` держит её всегда на виду; учитывает
`safe-area-inset-bottom` (home-indicator iOS).

⚠️ Размещай как **последний ребёнок** прокручиваемого контейнера. Sticky ломается, если
у любого предка задан `overflow` (кроме `visible`).

```tsx
import { StickyActionBar, useScrollGate } from '@letar/ui' // Простой случай — всегда видимая CTA
<StickyActionBar>
  <Button colorPalette="brand" size="lg" onClick={onStart}>Начать</Button>
</StickyActionBar>

// С гейтом «прочитай до конца»
const { sentinelRef, reachedEnd } = useScrollGate({ enabled: !consentGiven })
<>
  <LongContent />
  <Box ref={sentinelRef} aria-hidden h="1px" />
  <StickyActionBar>
    <Button disabled={!reachedEnd} onClick={onStart}>Начать</Button>
  </StickyActionBar>
</>
```

### AdminEditOverlay

Иконка-карандаш поверх карточки, ведущая в раздел редактирования (например `/admin/[slug]`).
Для inline admin-controls на публичных страницах — рендерится только если `isAdmin()` вернул
`true` на сервере (см. [auth.md](/.claude/docs/auth.md#inline-admin-controls-на-публичных-страницах-server-side)).

⚠️ Если карточка уже обёрнута в `Link`/`NextLink` — клади `AdminEditOverlay` как sibling
внутри `Box position="relative"`, не внутрь анкора (вложенные `<a>` невалидны).

```tsx
import { AdminEditOverlay } from '@letar/ui'

<Box position="relative">
  {isAdmin && <AdminEditOverlay href={`/admin/${slug}`} colorPalette="brand" />}
  <Link asChild><NextLink href={`/item/${slug}`}>...карточка...</NextLink></Link>
</Box>
```

## Хуки

### useServiceWorker

Хук для работы с Service Worker.

```tsx
import { useServiceWorker } from '@letar/ui'

const { registration, updateAvailable, update } = useServiceWorker()
```

### useScrollGate

Гейт «прочитай до конца перед действием». Наблюдает за маркером-`sentinel` в конце
контента через IntersectionObserver: как только маркер показался — `reachedEnd`
становится `true` навсегда. Если контент короче экрана — гейт открывается сразу.
`enabled: false` отключает гейт (например, когда согласие уже дано). См. пример в
[StickyActionBar](#stickyactionbar).

```tsx
import { useScrollGate } from '@letar/ui'

const { sentinelRef, reachedEnd } = useScrollGate({ enabled: true })
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
