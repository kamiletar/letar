# @letar/admin-ui

Библиотека переиспользуемых компонентов для админ-панелей.

## Установка

Библиотека использует peer dependencies:

```bash
# Обязательные
bun add @chakra-ui/react react react-icons next
bun add @dnd-kit/core @dnd-kit/modifiers @dnd-kit/sortable @dnd-kit/utilities

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

| Компонент           | Описание                                     |
| ------------------- | -------------------------------------------- |
| `GenericAdminTable` | Универсальная таблица с DnD и bulk actions   |
| `BulkActionsBar`    | Панель массовых действий                     |
| `TableSkeleton`     | Skeleton при загрузке                        |
| `commonBulkActions` | Предустановленные действия (publish, delete) |

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

| Компонент           | Описание                                                                             |
| ------------------- | ------------------------------------------------------------------------------------ |
| `SortablePhotoGrid` | Сетка фото с drag&drop-сортировкой (мышь/тач/клавиатура) и кнопкой «Сделать главной» |

```tsx
import { SortablePhotoGrid } from '@letar/admin-ui'
;<SortablePhotoGrid
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

;<GenericAdminTable
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
