# @letar/admin-ui

Библиотека переиспользуемых компонентов для админ-панелей.

## Установка

Библиотека использует peer dependencies:

```bash
# Обязательные
bun add @chakra-ui/react react react-icons next
bun add @dnd-kit/core @dnd-kit/modifiers @dnd-kit/sortable @dnd-kit/utilities
bun add @tanstack/react-table

# Опциональные (для SlugField, SeoField)
# Если используете @letar/forms
```

## Компоненты

### Layout

| Компонент           | Описание                           |
| ------------------- | ---------------------------------- |
| `AdminSidebar`      | Сворачиваемый sidebar с навигацией |
| `MobileAdminDrawer` | Мобильное меню (Drawer)            |
| `AdminNav`          | Навигация с активным пунктом       |
| `AdminBreadcrumbs`  | Хлебные крошки из URL              |

### Table

| Компонент           | Описание                                                   |
| ------------------- | ---------------------------------------------------------- |
| `GenericAdminTable` | Универсальная таблица с DnD-порядком и bulk actions        |
| `DataTable`         | Таблица на `@tanstack/react-table` с серверной сортировкой |
| `BulkActionsBar`    | Панель массовых действий                                   |
| `TableSkeleton`     | Skeleton при загрузке                                      |
| `commonBulkActions` | Предустановленные действия (publish, delete)               |

#### `DataTable`

Для списков без ручной пересортировки (DnD) — клиенты, заказы, логи. Сортировка по клику на
заголовок обновляет URL-параметр (`sort=field` / `sort=-field`) через `router.push`, а сами
данные в нужном порядке готовит вызывающий Server Component — компонент их не хранит и не
пересчитывает сам. Пагинация — соседний `<Pagination>`.

```tsx
import { DataTable, Pagination } from '@letar/admin-ui'
import type { ColumnDef } from '@tanstack/react-table'

const columns: ColumnDef<Client>[] = [
  { accessorKey: 'name', header: 'Имя' },
  { accessorKey: 'phone', header: 'Телефон', enableSorting: false },
  { accessorKey: 'createdAt', header: 'Дата', cell: (c) => formatDate(c.getValue()) },
]

<DataTable data={clients} columns={columns} />
<Pagination total={total} pageSize={PAGE_SIZE} />
```

### Filters

| Компонент      | Описание                              |
| -------------- | ------------------------------------- |
| `SearchFilter` | Поиск с debounce и URL-синхронизацией |
| `StatusFilter` | Фильтр по статусу                     |
| `Pagination`   | URL-синхронизированная пагинация      |

### Feedback

| Компонент            | Описание                      |
| -------------------- | ----------------------------- |
| `EmptyState`         | Пустое состояние списка       |
| `StatusBadge`        | Цветные бейджи статусов       |
| `DeleteConfirmation` | Диалог подтверждения удаления |

### Photo

| Компонент           | Описание                                                                                   |
| ------------------- | ------------------------------------------------------------------------------------------ |
| `SinglePhotoUpload` | Карточка загрузки одной картинки (обложка/аватар) — превью + кнопка через `useImageUpload` |
| `SortablePhotoGrid` | Сетка фото с drag&drop-сортировкой (мышь/тач/клавиатура) и кнопкой «Сделать главной»       |

#### `SinglePhotoUpload`

Для одной картинки (обложка поста, фото сотрудника) — не путать с `SortablePhotoGrid` (галерея
из нескольких фото). Сам вызывает `useImageUpload({ category })` и после успешной загрузки
отдаёт URL вызывающей стороне — сохранение (server action конкретного приложения) и
`router.refresh()` остаются на стороне вызывающего компонента, библиотека не знает о Prisma/схеме.

```tsx
import { SinglePhotoUpload } from '@letar/admin-ui'

<SinglePhotoUpload
  imageUrl={coverImageUrl}
  category="blog"
  onUpload={async (url) => {
    await setBlogPostCoverAction(id, url)
    router.refresh()
  }}
/>

// Круглый аватар вместо прямоугольной обложки — variant="avatar" + свои подписи
<SinglePhotoUpload
  imageUrl={photoUrl}
  category="team"
  variant="avatar"
  title="Фото"
  emptyText="Пока нет фото"
  uploadLabel="Загрузить фото"
  replaceLabel="Заменить фото"
  onUpload={async (url) => {
    await setTeamMemberPhotoAction(id, url)
    router.refresh()
  }}
/>
```

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

Загрузку файлов держит вызывающий компонент — сетка только сортирует/удаляет/помечает главное
(первый элемент в порядке) через переданные server actions. `onReorder`/`onSetCover`/`onDelete`
должны вернуть `{ error?: string }` — при ошибке UI откатывает оптимистичное обновление.

#### `createImageGalleryActions` (`@letar/admin-ui/server`)

Фабрика 5 Server Actions под `SortablePhotoGrid` — add/delete/reorder/setCover/updateAlt для
модели галереи с полями `id`/`order`/`alt` и одним FK. Не завязана на конкретный ZenStack-клиент
приложения — `getContext(user)` возвращает делегат модели + `$transaction` вызывающей стороны:

```ts
// house-image.action.ts
'use server'
import { createImageGalleryActions } from '@letar/admin-ui/server'

const actions = createImageGalleryActions({
  fkField: 'houseId',
  requireRole,
  roles: HOUSE_ADMIN_ROLES,
  getContext: (user) => {
    const db = getEnhancedPrisma(user as never)
    return { model: db.houseImage, transaction: (ops) => db.$transaction(ops) }
  },
  revalidatePathFor: (houseId) => `/admin/houses/${houseId}/`,
  revalidatePath,
})

export async function addHouseImageAction(houseId: string, url: string) {
  return actions.addImageAction(houseId, url)
}
// ...deleteImageAction, reorderImagesAction, setCoverImageAction, updateImageAltAction
```

Образец — `apps/domwellbes` (`house-image.action.ts`, `material-image.action.ts`,
`portfolio-image.action.ts`).

### Form Fields

| Компонент   | Описание                                |
| ----------- | --------------------------------------- |
| `SlugField` | Связанные Title + Slug с автогенерацией |
| `SeoField`  | SEO поля с автокопированием             |

### Hooks

| Хук            | Описание                         |
| -------------- | -------------------------------- |
| `useSelection` | Управление множественным выбором |

### Utils

| Функция   | Описание                         |
| --------- | -------------------------------- |
| `slugify` | Генерация slug с транслитерацией |

## Использование

```tsx
import {
  AdminBreadcrumbs,
  type AdminNavItem,
  AdminSidebar,
  commonBulkActions,
  EmptyState,
  GenericAdminTable,
  MobileAdminDrawer,
  Pagination,
  SearchFilter,
  StatusBadge,
} from '@letar/admin-ui'

// Конфигурация навигации
const navItems: AdminNavItem[] = [
  { href: '/admin', label: 'Dashboard', icon: LuHouse },
  { href: '/admin/products', label: 'Товары', icon: LuShoppingBag },
]

// В layout.tsx
export default function AdminLayout({ children }) {
  return (
    <Flex minH="100vh">
      <AdminSidebar
        navItems={navItems}
        userEmail={session?.user?.email}
        onLogout={logoutAction}
        title="Админ-панель"
        colorPalette="purple"
      />
      <Box flex={1}>
        <MobileAdminDrawer navItems={navItems} userEmail={session?.user?.email} onLogout={logoutAction} />
        <AdminBreadcrumbs pathNames={{ products: 'Товары' }} />
        {children}
      </Box>
    </Flex>
  )
} // В списке

<GenericAdminTable
  items={products}
  columns={[
    { header: 'Название', accessor: 'name', fontWeight: 'medium' },
    { header: 'Статус', accessor: (p) => <StatusBadge type="published" value={p.published} /> },
  ]}
  bulkActions={(handle) => [
    commonBulkActions.publish((ids) => handle(() => bulkPublish(ids))),
    commonBulkActions.delete((ids) => handle(() => bulkDelete(ids))),
  ]}
  editHref="/admin/products"
/>
```

## Кастомизация

Все компоненты поддерживают `colorPalette` для изменения цветовой схемы:

```tsx
<AdminSidebar colorPalette="teal" />
<GenericAdminTable colorPalette="blue" />
<StatusFilter colorPalette="green" />
```
