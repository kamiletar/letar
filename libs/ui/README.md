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
<TopLoader />
```

### ConfirmDialog

Диалог подтверждения действия.

```tsx
import { ConfirmDialog } from '@letar/ui'
<ConfirmDialog
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
<FilterPanel>
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
<OptimizedAvatar src="/avatar.jpg" name="Иван" />
```

### ReviewCard

Карточка отзыва.

```tsx
import { ReviewCard } from '@letar/ui'
<ReviewCard review={{ text: 'Отличный сервис!', rating: 5 }} author={{ name: 'Анна', avatar: '/anna.jpg' }} />
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
  <Link asChild>
    <NextLink href={`/item/${slug}`}>...карточка...</NextLink>
  </Link>
</Box>
```

### PhotoGallery

Сетка превью с лайтбоксом (yet-another-react-lightbox + Zoom + Fullscreen). Превью грузятся через
`next/image` с дефолтным `quality`, а полноразмерное фото в лайтбоксе — через `/_next/image` с
`lightboxQuality` (по умолчанию **85**).

⚠️ **Next.js 16 по умолчанию разрешает только `quality: 75`.** Если твой `next.config` не
переопределяет `images.qualities`, `/_next/image` вернёт **400** при открытии лайтбокса (превью на
дефолтных 75 при этом продолжат грузиться нормально — баг незаметен в сетке, только при клике на
фото). Обязательно добавь в `next.config.mjs` потребителя:

```js
const nextConfig = {
  images: { qualities: [75, 85] }, // 75 — дефолт превью, 85 — lightboxQuality
}
```

(наступили на этот баг в `aprel8008` — см. `apps/aprel8008/CHANGELOG.md` 2026-07-21).

```tsx
import { PhotoGallery } from '@letar/ui'
<PhotoGallery photos={photos.map((p) => ({ src: `/api/files/${p.path}`, alt: p.alt }))} />
```

### ImageMagnifier

Изображение с лупой: под курсором участок показывается в натуральном разрешении 1:1, вокруг — то же
изображение, ужатое до контейнера. Нужен там, где мелкая деталь физически теряется при уменьшении и
её надо показать, не обманывая зрителя монтажом — пиксели берутся из того же файла.

Мышь ведёт лупу, клик закрепляет; тап ставит лупу в точку (скролл не блокируется); стрелки двигают,
Enter/Space закрепляет. При появлении в зоне видимости лупа один раз проезжает сама (`autoDemo`),
`prefers-reduced-motion` уважается.

```tsx
import { ImageMagnifier } from '@letar/ui'
<ImageMagnifier
  src="/demo/poster-fragment.webp"
  placeholderSrc="/demo/poster-fragment-far.webp"
  naturalWidth={3200}
  naturalHeight={2200}
  alt="Фрагмент постера: вблизи проступают слова"
  hint="Наведите — как будто подошли ближе"
/>
```

⚠️ **`src` грузится с `unoptimized`** — через `/_next/image` пришла бы масштабированная копия, и
координаты лупы разъехались бы. Файл отдаётся как есть, поэтому класть в `public/` надо уже
подготовленный кроп, а не исходник на десятки мегабайт.

Полный файл грузится лениво, и до его загрузки лупа не работает — до этого момента виден только
`placeholderSrc`. Ставить `priority` через `next/image` тут не стоит: файл тяжёлый, а секция обычно
не первый экран.

`lensSize` — верхняя граница: реальный диаметр ужимается до долей контейнера, иначе на узком экране
лупа закрывает весь кадр и сравнивать «мелко/крупно» не с чем.

### SortablePhotoGrid (`@letar/admin-ui`)

Сетка фото с drag&drop-сортировкой (`@dnd-kit`, мышь/тач/клавиатура) и опциональной кнопкой
«Сделать главной» — первое фото в порядке считается cover. Загрузку файлов держит вызывающий
компонент, эта сетка только сортирует/удаляет/помечает главное через переданные server actions.

```tsx
import { SortablePhotoGrid } from '@letar/admin-ui'
<SortablePhotoGrid
  items={photos.map((p) => ({ id: p.id, imageUrl: `/api/files/${p.path}` }))}
  onReorder={(orderedIds) => reorderPhotosAction(estateSlug, orderedIds)}
  onSetCover={(id) => setCoverPhotoAction(id)}
  onDelete={(id) => deletePhotoAction(id)}
  onChanged={() => router.refresh()}
/>
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

### useAnalyticsConsent / AnalyticsGate

Consent-aware гейтинг аналитики (152-ФЗ, `.claude/docs/personal-data.md §5`). Читает состояние
согласия из localStorage (namespace общий с `CookieBanner`/`createConsentConfig`) и реактивно
обновляется по событию `{appKey}:consent-change`. `AnalyticsGate` — Client Component-обёртка для
использования прямо в Server Component layout, без отдельного `analytics-consent.tsx` на каждое
приложение:

```tsx
// Server Component layout.tsx
import { UmamiScript } from '@letar/analytics'
import { AnalyticsGate, CookieBanner } from '@letar/ui'

;<AnalyticsGate appKey="my-app">
  <UmamiScript />
</AnalyticsGate>
<CookieBanner appKey="my-app" />
```

`AnalyticsGate` принимает несколько `children` — удобно для приложений с двумя счётчиками
(например, Umami + Yandex Metrika), не требует по обёртке на каждый. Хук `useAnalyticsConsent`
экспортируется отдельно для нестандартных случаев (напр. когда компонент аналитики сам принимает
`hasConsent` пропом, как `@letar/yandex-metrika`).

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
