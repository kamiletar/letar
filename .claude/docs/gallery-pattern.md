# Галерея изображений — Dropzone + SortablePhotoGrid + Server Actions

Паттерн для админок, где у сущности (товар, дом, материал, объект недвижимости) есть галерея
из нескольких изображений с drag-реордером, назначением обложки, alt-текстом и удалением.
Используй его, когда сущности нужна **упорядоченная коллекция изображений**, а не одно поле
`imageUrl` — как только заходит речь о «несколько фото, порядок важен, первое — обложка».

## Из чего состоит

1. **Модель БД** — join/child-таблица с полем порядка сортировки (`order` или `sortOrder`,
   `Int @default(0)`) и `@@index` по внешнему ключу (+ порядку). **Обложка не хранится отдельным
   булевым полем** — это соглашение «первое изображение по порядку». Пример:

```zmodel
model HouseImage {
  id      String @id @default(cuid())
  houseId String
  url     String
  alt     String?
  order   Int    @default(0)

  house House @relation(fields: [houseId], references: [id], onDelete: Cascade)

  @@allow('read', house.isPublished)
  @@allow('create,update,delete', auth() != null && auth().isAdmin)
  @@index([houseId])
}
```

Возможны варианты: `HouseImage` в domwellbes хранит `url`/`alt` прямо в строке; `ProductImage`
в aboi — join-таблица на отдельную модель `Image` (`imageId` вместо `url`). Оба варианта
валидны, выбирай по тому, переиспользуется ли изображение вне галереи конкретной сущности.

2. **Server Actions** — пять точечных операций, каждая со своей ревалидацией:

   - `add<X>ImageAction(entityId, url)` — находит `findFirst({orderBy:{order:'desc'}})`,
     создаёт запись с `order: (last?.order ?? -1) + 1`.
   - `delete<X>ImageAction(entityId, imageId)` — обычный `delete`.
   - `reorder<X>ImagesAction(entityId, orderedIds: string[])` — `$transaction` из
     `orderedIds.map((id, index) => update({ where: { id }, data: { order: index } }))`.
   - `setCover<X>ImageAction(entityId, imageId)` — **обложка = переместить в начало**: берёт все
     изображения `orderBy: order asc`, строит `[imageId, ...rest]`, транзакцией переиндексирует
     `0..n-1`. Никакого отдельного `isCover`-флага.
   - `updateAlt<X>ImageAction(entityId, imageId, alt)` — `update({ data: { alt: alt.trim() ||
     null } })`, пустая строка нормализуется в `null`.

   Все пять возвращают `{ error?: string }`, используют `getEnhancedPrisma()` с ролевой
   проверкой (`requireRole([...])`) и вызывают `revalidatePath` на странице сущности.

3. **Клиентский компонент** — тонкая обёртка приложения вокруг двух готовых блоков из `libs/`:

   - Загрузка: [`Dropzone`](/libs/image-upload/src/lib/dropzone.tsx) (drag-таргет + скрытый
     `<input type="file">`) + [`useImageUpload`](/libs/image-upload/src/lib/use-image-upload.ts)
     из `@letar/image-upload` — `uploadMany(fileList)` грузит файлы на `/api/upload`, возвращает
     `UploadedImage[]` с готовым `url`. После загрузки — цикл `add<X>ImageAction(entityId,
     image.url)` по каждому файлу, затем `router.refresh()`.
   - Отображение/реордер/удаление/обложка/alt: `SortablePhotoGrid` из `@letar/admin-ui` —
     один компонент на `@dnd-kit`, принимает пять callback-пропов (`onReorder`, `onDelete`,
     опционально `onSetCover`, `onEditAlt`, `onChanged`) и делает всё сам: оптимистичный
     drag-реордер с откатом к последним пропам при ошибке, `isCover = index === 0`,
     `useTransition` на все мутации.

## Готовый шаблон для нового приложения

```tsx
// _components/<entity>-images-section.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Dropzone, useImageUpload } from '@letar/image-upload'
import { SortablePhotoGrid } from '@letar/admin-ui'
import {
  add<Entity>ImageAction,
  delete<Entity>ImageAction,
  reorder<Entity>ImagesAction,
  setCover<Entity>ImageAction,
  update<Entity>ImageAltAction,
} from '../_actions/<entity>-image.action'

interface <Entity>Image {
  id: string
  url: string
  alt: string | null
}

interface <Entity>ImagesSectionProps {
  entityId: string
  images: <Entity>Image[]
}

export function <Entity>ImagesSection({ entityId, images }: <Entity>ImagesSectionProps) {
  const router = useRouter()
  const { isUploading, uploadMany } = useImageUpload({ category: '<entity>', multiple: true })
  const [uploadError, setUploadError] = useState<string | null>(null)

  async function handleFilesSelected(fileList: FileList) {
    const uploaded = await uploadMany(fileList)
    for (const image of uploaded) {
      const result = await add<Entity>ImageAction(entityId, image.url)
      if (result.error) setUploadError(result.error)
    }
    router.refresh()
  }

  return (
    <>
      <Dropzone onFilesSelected={handleFilesSelected} multiple disabled={isUploading} mb={4} />
      <SortablePhotoGrid
        items={images.map((img) => ({ id: img.id, imageUrl: img.url, alt: img.alt ?? '' }))}
        onReorder={(orderedIds) => reorder<Entity>ImagesAction(entityId, orderedIds)}
        onSetCover={(id) => setCover<Entity>ImageAction(entityId, id)}
        onEditAlt={(id, alt) => update<Entity>ImageAltAction(entityId, id, alt)}
        onDelete={(id) => delete<Entity>ImageAction(entityId, id)}
        onChanged={() => router.refresh()}
      />
    </>
  )
}
```

```typescript
// _actions/<entity>-image.action.ts
'use server'

import { revalidatePath } from 'next/cache'
import { requireRole } from '@/lib/auth'
import { getEnhancedPrisma } from '@/lib/db'

export async function add<Entity>ImageAction(entityId: string, url: string) {
  const user = await requireRole([...])
  const db = getEnhancedPrisma(user as never)
  const last = await db.<entity>Image.findFirst({
    where: { entityId },
    orderBy: { order: 'desc' },
  })
  await db.<entity>Image.create({
    data: { entityId, url, order: (last?.order ?? -1) + 1 },
  })
  revalidatePath(`/admin/<entities>/${entityId}/`)
  return {}
}

export async function delete<Entity>ImageAction(entityId: string, imageId: string) {
  const user = await requireRole([...])
  const db = getEnhancedPrisma(user as never)
  await db.<entity>Image.delete({ where: { id: imageId } })
  revalidatePath(`/admin/<entities>/${entityId}/`)
  return {}
}

export async function reorder<Entity>ImagesAction(entityId: string, orderedIds: string[]) {
  const user = await requireRole([...])
  const db = getEnhancedPrisma(user as never)
  await db.$transaction(
    orderedIds.map((id, index) => db.<entity>Image.update({ where: { id }, data: { order: index } })),
  )
  revalidatePath(`/admin/<entities>/${entityId}/`)
  return {}
}

export async function setCover<Entity>ImageAction(entityId: string, imageId: string) {
  const user = await requireRole([...])
  const db = getEnhancedPrisma(user as never)
  const siblings = await db.<entity>Image.findMany({ where: { entityId }, orderBy: { order: 'asc' } })
  const reordered = [imageId, ...siblings.map((s) => s.id).filter((id) => id !== imageId)]
  await db.$transaction(
    reordered.map((id, index) => db.<entity>Image.update({ where: { id }, data: { order: index } })),
  )
  revalidatePath(`/admin/<entities>/${entityId}/`)
  return {}
}

export async function update<Entity>ImageAltAction(entityId: string, imageId: string, alt: string) {
  const user = await requireRole([...])
  const db = getEnhancedPrisma(user as never)
  await db.<entity>Image.update({ where: { id: imageId }, data: { alt: alt.trim() || null } })
  revalidatePath(`/admin/<entities>/${entityId}/`)
  return {}
}
```

## Что не унифицировано между приложениями — не удивляйся расхождению

- **Имя поля порядка** — `order` (domwellbes) vs `sortOrder` (aboi). Оба варианта уже есть в
  коде, не переименовывай существующие ради единообразия.
- **Способ загрузки файла** — эталонный путь через `Dropzone`/`useImageUpload` описан выше
  (используй его для новых приложений). Более старая реализация в aboi (`product-image-manager.tsx`)
  грузит файл вручную через `fetch('/api/images', ...)` без `Dropzone` — не копируй этот подход,
  он не рефакторился только потому, что работает.
- **URL-конвенция** — DB-хранимый `url` (domwellbes), `/api/files/${path}` через отдельную
  `Image`-модель (aboi), `/api/files/estates/${slug}/${filename}` по имени файла на диске
  (aprel8008). Выбор зависит от того, живут ли файлы в файловой системе приложения или через
  общий upload-эндпоинт — см. [images.md](/.claude/docs/images.md).

## Где встречается

- [product-image-manager.tsx](/apps/aboi/src/app/[locale]/admin/products/[id]/_components/product-image-manager.tsx) + `products.action.ts` (`ProductImage`, поле `sortOrder`, join на `Image`)
- [house-images-section.tsx](/apps/domwellbes/src/app/(admin)/admin/houses/_components/house-images-section.tsx) + [house-image.action.ts](/apps/domwellbes/src/app/(admin)/admin/_actions/house-image.action.ts) (`HouseImage`, эталонная реализация — `Dropzone`/`useImageUpload`)
- [material-images-section.tsx](/apps/domwellbes/src/app/(admin)/admin/materials/_components/material-images-section.tsx) + [material-image.action.ts](/apps/domwellbes/src/app/(admin)/admin/_actions/material-image.action.ts) (`MaterialImage`, байт-в-байт та же структура, что и houses)
- `apps/aprel8008/src/app/admin/[slug]/_components/PhotoManager.tsx` (галерея объектов недвижимости, свой bulk-эндпоинт загрузки вместо `useImageUpload`)
- Общие компоненты: [`SortablePhotoGrid`](/libs/admin-ui/src/photo/sortable-photo-grid.tsx) (`@letar/admin-ui`), [`Dropzone`/`useImageUpload`](/libs/image-upload/src/index.ts) (`@letar/image-upload`)
