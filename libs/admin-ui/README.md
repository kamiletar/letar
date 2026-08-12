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

| Компонент             | Описание                                                   |
| --------------------- | ---------------------------------------------------------- |
| `GenericAdminTable`   | Универсальная таблица с DnD-порядком и bulk actions        |
| `DataTable`           | Таблица на `@tanstack/react-table` с серверной сортировкой |
| `InlineEditableTable` | Инлайн-CRUD таблица (форма редактирования прямо в строке)  |
| `BulkActionsBar`      | Панель массовых действий                                   |
| `TableSkeleton`       | Skeleton при загрузке                                      |
| `commonBulkActions`   | Предустановленные действия (publish, delete)               |

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

#### `InlineEditableTable` + `useInlineCrudList`

Инлайн-CRUD секция админки (позиции состава, нормы расхода, уровни упаковки и т.п.): список в
карточке, строка редактирования разворачивается в форму на всю ширину таблицы, создание — форма
под таблицей. `useInlineCrudList` держит state (`items`, `editingId`) и create/update/delete —
Server Action пишется вызывающим кодом и возвращает элемент, готовый для отображения в списке.
`InlineEditableTable` строит саму разметку — колонки и обе формы (create/edit) остаются за
вызывающей секцией, у каждой свой набор полей и Zod-схема.

```tsx
import { InlineEditableTable, useInlineCrudList } from '@letar/admin-ui'

const list = useInlineCrudList({
  initialItems: initialExtras,
  getId: (extra) => extra.id,
  sortBy: (extra) => extra.order,
  onCreate: (data) => createHouseExtra(houseId, data),
  onUpdate: (id, data) => updateHouseExtra(houseId, id, data),
  onDelete: (id) => deleteHouseExtra(houseId, id),
})

<InlineEditableTable
  title="Не входит в цену"
  items={list.items}
  getId={(extra) => extra.id}
  editingId={list.editingId}
  onEdit={list.setEditingId}
  onDelete={list.handleDelete}
  onAdd={() => list.setEditingId('new')}
  emptyMessage="Пока пусто"
  columns={[
    { header: 'Название', render: (extra) => extra.title },
    { header: 'Цена', render: (extra) => formatKopecks(extra.priceKopecks) },
  ]}
  renderEditForm={(extra) => (
    <ExtraForm initialValue={extra} onSubmit={(data) => list.handleUpdate(extra.id, data)} onCancel={() => list.setEditingId(null)} />
  )}
  renderCreateForm={() => (
    <ExtraForm initialValue={EMPTY_EXTRA} onSubmit={list.handleCreate} onCancel={() => list.setEditingId(null)} />
  )}
/>
```

`onCreate`/`onUpdate` не обязаны возвращать Server Action как есть — если ответ действия не
совпадает по форме с элементом списка (например, нужно домешать label выбранной опции или
привести `Decimal` к `number`), внутри колбэка можно собрать нужную форму вручную. Образец — 8
секций `apps/domwellbes/src/app/(admin)/admin/` (`house-extras-section.tsx` — простой случай,
`house-items-section.tsx` — с маппингом ответа).

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

## Бэклог

### [2026-08-12→2026-08-13] CRUD-inline-list — извлечён как `InlineEditableTable` + `useInlineCrudList`

Кандидат на извлечение из бэклога реализован (см. раздел «Table» выше). Переведено 8 секций
`apps/domwellbes/src/app/(admin)/admin/`: `houses/_components/house-extras-section.tsx`,
`house-items-section.tsx`, `works/_components/work-material-norms-section.tsx`,
`work-machine-norms-section.tsx`, `materials/_components/material-packaging-section.tsx`,
`materials/categories/_components/attribute-definitions-section.tsx`,
`cases/_components/case-stages-section.tsx`, `estimates/_components/estimate-limited-costs-section.tsx`.

`houses/_components/house-option-groups-section.tsx` проверен отдельно (2026-08-13) и **не
подходит**: двухуровневая структура (группа → опции), два независимых `editingId`-состояния
вместо одного, вложенная `Table.Root` внутри строки группы вместо плоского списка. Компонент
не переведён — детали в `apps/domwellbes/PLAN_COMPLETED.md`.
