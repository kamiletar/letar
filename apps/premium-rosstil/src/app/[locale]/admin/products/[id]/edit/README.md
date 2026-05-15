# Управление вариантами и товарами продукта

## ✅ Реализовано (Backend & Actions)

### Schemas

- `_schemas/variant-form.schema.ts` - Схема для создания/редактирования варианта
- `_schemas/item-form.schema.ts` - Схема для создания/редактирования товара

### Server Actions для Variant

- `_actions/create-variant.ts` - Создание варианта продукта
- `_actions/update-variant.ts` - Обновление варианта
- `_actions/delete-variant.ts` - Удаление варианта (каскадно удаляет items и images)

### Server Actions для Item

- `_actions/create-item.ts` - Создание товара (размер + цена)
- `_actions/update-item.ts` - Обновление товара
- `_actions/delete-item.ts` - Удаление товара

### Server Actions для изображений

- `_actions/upload-images.ts` - Сохранение загруженных изображений в БД
- `_actions/delete-image.ts` - Удаление изображения (из БД и файловой системы)
- `_actions/reorder-images.ts` - Изменение порядка изображений (drag-and-drop)

## ✅ Реализовано (Frontend & UI - базовая версия)

### Компоненты

1. **Image Upload Component** (`_components/image-upload.tsx`) ✅
   - Массовая загрузка изображений
   - Drag-and-drop интерфейс
   - Preview загруженных файлов с прогрессом
   - Интеграция с `/api/upload`
   - Status tracking для каждого файла (pending/uploading/success/error)

2. **Variant Management** (`_components/variants-management.tsx`) ✅
   - Список вариантов продукта с раскрывающимися карточками
   - Отображение товаров и изображений варианта
   - Кнопки для создания/редактирования/удаления (подключение к actions - TODO)

3. **Page Update** (`page.tsx`) ✅
   - Интеграция компонента управления вариантами
   - Загрузка вариантов, товаров и изображений из БД
   - Разделение на секции (основная информация + варианты)
   - Расширенный контейнер (maxW="6xl")

## 🚧 TODO (Доработка UI)

### Необходимо доработать:

1. **Dialog Forms** - Создать модальные окна с формами для:
   - Создания/редактирования варианта (VariantFormDialog)
   - Создания/редактирования товара (ItemFormDialog)
   - Использовать Conform Future API + Chakra UI Dialog
   - Подключить к существующим server actions

2. **Image Gallery with DnD** - Доработать галерею изображений:
   - Drag-and-drop для изменения порядка (dnd-kit)
   - Интеграция с `reorder-images.ts` action
   - Кнопки удаления изображений с подтверждением
   - Интеграция компонента ImageUpload в карточку варианта

3. **Delete Confirmations** - Добавить подтверждения удаления:
   - Для вариантов (проверка наличия товаров/изображений)
   - Для товаров
   - Использовать паттерн из `delete-product-button.tsx`

## API Endpoints (уже существующие)

- `POST /api/upload` - Загрузка изображения (возвращает URL)
- `DELETE /api/upload?url=...` - Удаление изображения с сервера
- `GET /api/files/[...path]` - Раздача загруженных файлов

## Database Models

```typescript
ProductVariant {
  id: string
  productId: string
  color: string
  composition: string
  items: ProductItem[]
  images: VariantImage[]
}

ProductItem {
  id: string
  variantId: string
  sizeId: string
  price: Decimal
  availableCount: Int
}

VariantImage {
  id: string
  variantId: string
  url: string
  alt?: string
  order: Int  // для drag-and-drop сортировки
}
```

## Следующие шаги

1. Создать компонент загрузки изображений с drag-and-drop
2. Создать UI для управления вариантами
3. Создать UI для управления товарами
4. Создать галерею изображений с возможностью изменения порядка
5. Интегрировать все компоненты на странице редактирования продукта
6. Протестировать весь flow создания продукта с вариантами

## Паттерны используемые в проекте

- **Conform Future API** для форм
- **Zod v4** для валидации
- **Chakra UI v3** для UI (Dialog, Portal, Positioner)
- **dnd-kit** для drag-and-drop
- **Server Actions** с revalidatePath для обновления данных
