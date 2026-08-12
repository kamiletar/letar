# Система изображений

Документация по работе с изображениями в приложениях монорепозитория.

## Архитектура

**ВАЖНО:** Изображения **НЕ должны** храниться в папке `public/`. Next.js копирует `public/` в `.next/static` при билде, и новые файлы, загруженные после билда, будут недоступны.

### Структура хранения

```
apps/<app-name>/
├── uploads/                    # Папка для загруженных файлов (вне public!)
│   ├── mandalas/              # Изображения мандал
│   ├── products/              # Изображения товаров
│   └── content/               # Изображения для контента
├── public/                     # ТОЛЬКО статические ресурсы (favicon, icons, manifest)
│   ├── favicon.ico
│   ├── icons/
│   └── robots.txt
└── src/
    ├── app/api/
    │   ├── files/[...path]/   # Сервинг файлов из uploads/
    │   └── upload/            # Загрузка файлов
    └── lib/images/            # Утилиты для работы с изображениями
```

## API Endpoints

### GET `/api/files/[...path]`

Сервинг файлов из папки `uploads/`.

**Пример:**

```
GET /api/files/mandalas/anahata.png
→ Возвращает файл из uploads/mandalas/anahata.png
```

**Заголовки ответа:**

- `Content-Type`: определяется по расширению файла
- `Cache-Control: public, max-age=31536000, immutable`

### Файлы с постоянным именем и `immutable`-кэш

`immutable` безопасен только тогда, когда URL меняется вместе с содержимым. Загруженные файлы
обычно получают cuid/хэш в имени, но редакционные изображения иногда перезаписываются под
постоянным именем (`cover.webp`, `banner.webp`). Такой файл нельзя вставлять в страницу прямым
неверсионированным URL: браузер вправе показывать старые байты целый год.

Для серверных компонентов и metadata используйте общий helper:

```typescript
import { getVersionedUploadUrl } from '@letar/image-upload/server/versioned-upload-url'

const coverUrl = getVersionedUploadUrl('content/article-1/cover.webp')
// → /api/files/content/article-1/cover.webp?v=4a67c2d970be
```

Helper читает файл при сборке/серверном рендере и добавляет короткий SHA-256 содержимого. При
изменении файла URL автоматически меняется, поэтому браузер, CDN и сервисы предпросмотра получают
новую версию. Пока содержимое не менялось, годовой `immutable`-кэш продолжает работать.

### POST `/api/upload`

Загрузка нового изображения. Требует авторизации (ADMIN).

**Параметры FormData:**

- `file` (File, обязательный) — файл изображения
- `category` (ImageCategory, опционально) — категория изображения

**Ответ:**

```json
{
  "success": true,
  "id": "cuid",
  "url": "/api/files/category/filename.png",
  "filename": "timestamp-random.png",
  "width": 1000,
  "height": 1000
}
```

### DELETE `/api/upload`

Удаление изображения. Требует авторизации (ADMIN).

**Параметры query:**

- `id` — ID записи Image в БД
- `url` — URL изображения (обратная совместимость)

## Модель данных

### Image

```prisma
model Image {
  id           String        @id @default(cuid())
  filename     String        // Оригинальное имя файла
  path         String        @unique  // Путь в uploads/
  mimeType     String        // image/png, image/jpeg и т.д.
  size         Int           // Размер в байтах
  width        Int?          // Ширина (определяется автоматически)
  height       Int?          // Высота (определяется автоматически)
  category     ImageCategory
  uploadedById String?
  uploadedAt   DateTime      @default(now())
}

enum ImageCategory {
  MANDALA   // Изображения мандал
  PRODUCT   // Изображения товаров
  CONTENT   // Изображения для контента
  OTHER     // Прочие изображения
}
```

## Утилиты lib/images

### `getImageUrl(path: string): string`

Формирует URL для доступа к изображению по пути.

```typescript
import { getImageUrl } from '@/lib/images'

const url = getImageUrl('mandalas/anahata.png')
// → '/api/files/mandalas/anahata.png'
```

### `createImageRecord(params): Promise<ImageRecord>`

Создаёт запись Image в БД. Автоматически определяет размеры изображения из buffer.

```typescript
import { createImageRecord } from '@/lib/images'

const image = await createImageRecord({
  filename: 'original-name.png',
  path: 'mandalas/unique-filename.png',
  mimeType: 'image/png',
  size: 102400,
  category: 'MANDALA',
  uploadedById: userId,
  buffer, // для определения размеров
})
```

### `deleteImageRecord(id: string)`

Удаляет запись Image из БД по ID.

### `getImageById(id: string): Promise<ImageRecord | null>`

Получает запись Image по ID.

### `getImageByPath(path: string): Promise<ImageRecord | null>`

Получает запись Image по пути.

## Использование в компонентах

### В JSX/TSX

```tsx
// Правильно
<Image src="/api/files/mandalas/anahata.png" alt="Мандала" />

// НЕПРАВИЛЬНО - не использовать прямые пути к public
<Image src="/images/mandalas/anahata.png" alt="Мандала" />
```

### В CSS/стилях

```tsx
// Правильно
<Box backgroundImage="url(/api/files/mandalas/anahata.png)" />

// НЕПРАВИЛЬНО
<Box backgroundImage="url(/mandalas/full/anahata.png)" />
```

### В HTML контенте (ContentPage)

```html
<!-- Правильно -->
<img src="/api/files/mandalas/flower_of_sun.png" alt="Мандала" />

<!-- НЕПРАВИЛЬНО -->
<img src="/mandalas/full/flower_of_sun.png" alt="Мандала" />
```

## Миграция существующих изображений

При переносе изображений из `public/` в систему `uploads/`:

1. **Скопируйте файлы:**

   ```bash
   mkdir -p uploads/mandalas
   cp -r public/mandalas/full/* uploads/mandalas/
   ```

2. **Обновите пути в JSON/seed:**

   ```bash
   # Замена путей в файлах
   sed -i 's|/images/mandalas/|/api/files/mandalas/|g' data/mandalas.json
   sed -i 's|/mandalas/full/|/api/files/mandalas/|g' prisma/seed.ts
   ```

3. **Пересидируйте базу данных:**

   ```bash
   nx db:seed <app-name>
   ```

4. **Удалите старые файлы из public (опционально):**
   ```bash
   rm -rf public/mandalas/full
   ```

## Приложения с системой изображений

⚠️ **Таблица не обновлялась с датой файла (2026-06-21) и неполна независимо от вопроса
premium-rosstil/imot (найдено 2026-08-12, не переписывала — см. `project_premium_rosstil_imot_removed`
в памяти про этот кластер).** Минимум 7 приложений имеют каталог `uploads/` и не перечислены:
`aboi`, `kami`, `domwellbes`, `aprel8008`, `dsperevod`, `studio`, `driving-school` (проверено
только наличие каталога, не структура подпапок/категорий — для точных путей `uploads/<x>/`
по каждому нужна отдельная сверка).

| Приложение      | Статус | Папка uploads                           |
| --------------- | ------ | --------------------------------------- |
| premium-rosstil | ✅     | `uploads/products/`, `uploads/avatars/` |
| mandala         | ✅     | `uploads/mandalas/`                     |
| imot            | ✅     | `uploads/avatars/`                      |

## Важные заметки

⚠️ **НИКОГДА** не храните загружаемые изображения в `public/`
⚠️ **ВСЕГДА** используйте `/api/files/` для доступа к загруженным изображениям
⚠️ При деплое убедитесь, что папка `uploads/` примонтирована как volume в Docker

---

## Галереи фотографий — паттерн `nextImageUrl` + `PhotoGallery`

> Реализовано в aprel8008 (Sprint 4) и эталонно закреплено в `libs/ui`.

### Ключевой инсайт: batch-скрипт pre-resize НЕ нужен

Next.js Image Optimization API (`/_next/image`) обрабатывает изображения **on-demand** и кеширует в `.next/cache/images` навсегда. Первый запрос медленный, последующие — мгновенные. Отдельный скрипт sharp для пакетного ресайза не нужен.

### Хелпер `nextImageUrl`

```typescript
// Встроен в PhotoGallery, но можно использовать напрямую
function nextImageUrl(src: string, w: number, q: number) {
  return `/_next/image?url=${encodeURIComponent(src)}&w=${w}&q=${q}`
}

// В лайтбоксе — 1080p/1920p слайды:
const slides = photos.map((p) => ({
  src: nextImageUrl(p.src, 1920, 85),
  alt: p.alt,
}))
```

Параметры: `w` — ширина (Next.js выберет ближайший deviceSize), `q` — качество 0–100.

### Компонент `PhotoGallery` из `@letar/ui`

**Стандартный способ для любой фото-галереи в монорепо.** Объединяет сетку + лайтбокс + a11y:

```tsx
import { PhotoGallery } from '@letar/ui'
<PhotoGallery
  photos={photos.map((p, i) => ({
    src: `/api/files/estates/${slug}/${p.filename}`,
    alt: `${estateName} — фото ${i + 1}`,
  }))}
  columns={{ base: 2, sm: 3, md: 4 }}
  loading={isLoadingMore} // показывает скелетоны при подгрузке
  lightboxMaxWidth={1920} // ширина в лайтбоксе (default: 1920)
  lightboxQuality={85} // качество в лайтбоксе (default: 85)
  aspectRatio={4 / 3} // соотношение сторон (default: 4/3)
/>
```

### Разделение ответственности для пагинированных галерей

```
GalleryInfiniteScroll     — данные, IntersectionObserver, скелетоны при пустом массиве
  └── PhotoGallery        — сетка, лайтбокс, nextImageUrl, a11y
        └── LightboxViewer — yet-another-react-lightbox + Zoom + Fullscreen
```

Если нужна только прокрутка данных — используй `GalleryInfiniteScroll` поверх `PhotoGallery`.\
Если нужен лайтбокс без сетки — используй `LightboxViewer` напрямую.

### Применение в других проектах

1. Добавить `@letar/ui` в `implicitDependencies` (`project.json`)
2. Настроить tsconfig `paths` + `references` на `libs/ui`
3. Импортировать `PhotoGallery` из `@letar/ui`
4. Передавать `photos: PhotoItem[]` — массив `{ src, alt? }`

---

**Последнее обновление:** 2026-06-21
