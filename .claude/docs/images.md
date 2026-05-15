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

| Приложение      | Статус | Папка uploads                           |
| --------------- | ------ | --------------------------------------- |
| premium-rosstil | ✅     | `uploads/products/`, `uploads/avatars/` |
| mandala         | ✅     | `uploads/mandalas/`                     |
| imot            | ✅     | `uploads/avatars/`                      |

## Важные заметки

⚠️ **НИКОГДА** не храните загружаемые изображения в `public/`
⚠️ **ВСЕГДА** используйте `/api/files/` для доступа к загруженным изображениям
⚠️ При деплое убедитесь, что папка `uploads/` примонтирована как volume в Docker
⚠️ Используйте `sharp` для оптимизации изображений (уже установлен в проектах)

---

**Последнее обновление:** 2026-01-01
