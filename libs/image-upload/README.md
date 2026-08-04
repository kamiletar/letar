# @letar/image-upload

Компоненты загрузки изображений с drag-and-drop, превью и интеграцией с API.

## Установка

Библиотека уже включена в монорепо. Для подключения к приложению нужны **три** вещи
(см. [libs.md](/.claude/rules/libs.md)):

```jsonc
// apps/<app>/tsconfig.json
{
  "compilerOptions": {
    "paths": { "@letar/image-upload": ["../../libs/image-upload/src/index.ts"] }
  },
  "references": [{ "path": "../../libs/image-upload" }]
}
```

```js
// apps/<app>/next.config.js
module.exports = {
  transpilePackages: ['@letar/image-upload'],
}
```

⚠️ Без `transpilePackages` `typecheck` пройдёт, а прод-билд упадёт на `Module not found`.

## Две схемы хранения — и как выбрать

Библиотека не навязывает способ хранения изображений. Разница только в том, **как из
сохранённого значения получить ссылку** — за это отвечают резолверы.

| Схема                      | Ответ `POST /api/upload`         | Что хранится в поле | Резолвер превью               |
| -------------------------- | -------------------------------- | ------------------- | ----------------------------- |
| Файл на диске              | `{ url: '/api/files/a.jpg' }`    | сам URL             | `createDirectUrlResolver()`   |
| `Image` в БД, отдаёт байты | `{ id: 'img-1' }`                | ID                  | по умолчанию                  |
| `Image` в БД, отдаёт JSON  | `{ id: 'img-1', url: '/f/...' }` | ID                  | `createMetadataUrlResolver()` |

Третий случай — самый коварный: `GET /api/images/<id>` возвращает **описание**
(`{ id, url, mimeType, ... }`), а не картинку. Подставить такой путь в `<img src>`
нельзя — ссылку надо сначала запросить. Так устроена `mandala`.

```tsx
// mandala: /api/images/<id> отдаёт JSON, картинка живёт на /api/files/<path>
const resolveImageUrl = createMetadataUrlResolver() // модульная константа, не инлайн!

<ImageUploadField value={imageId} onChange={setImageId} resolveImageUrl={resolveImageUrl} />
```

Если сервер отвечает совсем по-своему — подмените разбор ответа целиком:

```tsx
useImageUpload({
  resolveUploadResponse: (data, file) => ({
    id: String(data.key),
    url: `https://cdn.example.com/${data.key}`,
    filename: file.name,
  }),
})
```

## Компоненты

### ImageUploadField — Одиночная загрузка

```tsx
import { ImageUploadField } from '@letar/image-upload'

function AvatarForm() {
  const [avatarId, setAvatarId] = useState<string | null>(null)

  return (
    <ImageUploadField
      label="Аватар"
      value={avatarId}
      onChange={setAvatarId}
      category="AVATAR"
      required
      helperText="PNG, JPG до 5MB"
    />
  )
}
```

### BulkImageUpload — Множественная загрузка

```tsx
import { BulkImageUpload } from '@letar/image-upload'

function ProductGallery() {
  const [imageIds, setImageIds] = useState<string[]>([])

  return (
    <BulkImageUpload title="Галерея товара" value={imageIds} onChange={setImageIds} maxImages={10} category="PRODUCT" />
  )
}
```

### Dropzone — Базовая зона

```tsx
import { Dropzone } from '@letar/image-upload'

function CustomUploader() {
  const handleFiles = (files: FileList) => {
    console.log('Selected:', files)
  }

  return <Dropzone onFilesSelected={handleFiles} multiple colorPalette="purple" />
}
```

### next/image вместо `<img>`

Библиотека намеренно не зависит от `next`. Приложениям на Next.js подставить
оптимизированную картинку помогает проп `renderImage`:

```tsx
<ImageUploadField
  renderImage={({ src, alt }) => <NextImage src={src} alt={alt} fill sizes="300px" style={{ objectFit: 'cover' }} />}
  previewProps={{ width: '100%', maxW: '300px', height: '200px' }}
/>
```

## Хуки

### useImageUpload

Очередь файлов со статусами **и** готовые обработчики drag-n-drop в одном хуке:

```tsx
const {
  upload,
  uploadMany,
  files,
  isUploading,
  getUploadedImages,
  // drag-n-drop
  isDragging,
  error,
  dragHandlers,
  handleFileSelect,
} = useImageUpload({
  category: 'PRODUCT',
  uploadEndpoint: '/api/upload',
  onUploadSuccess: (image) => console.log('Загружено:', image.id, image.url),
  onUploadError: (error, file) => console.error(error, file.name),
})

return (
  <Box {...dragHandlers}>
    <input type="file" multiple onChange={handleFileSelect} />
  </Box>
)
```

`upload` не бросает исключений: при неудаче возвращает `null`, кладёт текст в `error`
и зовёт `onUploadError`.

### useFileDragDrop

Только drag-n-drop, без привязки к изображениям — `acceptTypes` принимает любой
MIME-шаблон (`'audio/*'`, `'application/pdf'`).

### useImagePreviewUrl

Превращает сохранённое значение (ID или готовую ссылку) в URL для показа.
Синхронный резолвер применяется сразу, асинхронный — с `isLoading`.

⚠️ Резолвер читается через ref, эффект зависит только от `value`. Инлайн-стрелка в
пропсах не вызовет цикл запросов, но и смена резолвера без смены `value` не
перезапросит ссылку — держите резолвер стабильным.

## API

### ImageUploadField Props

| Prop              | Type                           | Default       | Description                        |
| ----------------- | ------------------------------ | ------------- | ---------------------------------- |
| `value`           | `string \| null`               | -             | ID изображения либо готовая ссылка |
| `onChange`        | `(id: string \| null) => void` | -             | Callback                           |
| `label`           | `string`                       | -             | Название поля                      |
| `error`           | `string`                       | -             | Ошибка валидации извне             |
| `required`        | `boolean`                      | `false`       | Обязательное                       |
| `disabled`        | `boolean`                      | `false`       | Отключено                          |
| `category`        | `ImageCategory`                | `'OTHER'`     | Категория                          |
| `uploadEndpoint`  | `string`                       | `/api/upload` | Куда грузить                       |
| `imageEndpoint`   | `string`                       | `/api/images` | База для резолвера по умолчанию    |
| `resolveImageUrl` | `ImageUrlResolver`             | шаблон        | Как получить ссылку из `value`     |
| `renderImage`     | `(args) => ReactNode`          | `<img>`       | Своя отрисовка картинки            |
| `previewProps`    | `ImagePreviewProps`            | -             | Переопределение размеров превью    |
| `colorPalette`    | `BoxProps['colorPalette']`     | `'blue'`      | Цветовая схема                     |

### BulkImageUpload Props

| Prop        | Type                      | Default   | Description           |
| ----------- | ------------------------- | --------- | --------------------- |
| `value`     | `string[]`                | `[]`      | Массив ID изображений |
| `onChange`  | `(ids: string[]) => void` | -         | Callback              |
| `maxImages` | `number`                  | -         | Максимум изображений  |
| `title`     | `string`                  | -         | Заголовок             |
| `category`  | `ImageCategory`           | `'OTHER'` | Категория             |

### ImageCategory

Тип открыт: подсказки IDE показывают частые значения, но принимается любая строка.
Предметная область конкретного приложения (`'MANDALA'`, `'HOUSE'`) объявляется
у приложения, а не здесь.

```typescript
type KnownImageCategory = 'PRODUCT' | 'THUMBNAIL' | 'AVATAR' | 'OTHER'
type ImageCategory = KnownImageCategory | (string & Record<never, never>)
```

## API Endpoints

Значения по умолчанию, каждое переопределяется пропсом:

- `POST /api/upload` — загрузка файла
- `GET /api/images/{id}` — получение изображения

## Темизация

Своих оттенков компоненты не задают — только семантические токены (`fg.muted`,
`border`, `border.error`) и `colorPalette.*`. Поэтому вид корректен в светлой и
тёмной теме, а перекрасить всё можно одним пропом `colorPalette`.

## Зависимости

- `@chakra-ui/react` >= 3.0.0
- `react` >= 18.0.0
- `react-icons` (для иконок)

## Потребители

- `apps/mandala` — админка мандал и товаров (с `next/image` и резолвером метаданных)

## Серверная часть — `@letar/image-upload/server`

Раздача загруженных файлов из `uploads/`. Отдельная точка входа: Node-only код
(`node:fs`, `node:path`) не тянет за собой React/Chakra из основного `index.ts`.

Зачем роут, а не `public/`: Next.js копирует `public/` в `.next/static` на этапе
билда, поэтому файлы, загруженные после сборки, оттуда недоступны.

### Использование

```ts
// src/app/api/files/[...path]/route.ts
import { createUploadsRoute } from '@letar/image-upload/server'

export const GET = createUploadsRoute()
```

### Опции

| Опция          | По умолчанию                          | Назначение                                        |
| -------------- | ------------------------------------- | ------------------------------------------------- |
| `root`         | `<cwd>/uploads`                       | Корень раздачи. Может быть симлинком (том Docker) |
| `mimeTypes`    | `DEFAULT_MIME_TYPES`                  | Дополнить/переопределить типы. Ключ — `.ext`      |
| `cacheControl` | `public, max-age=31536000, immutable` | Значение `Cache-Control`                          |
| `headers`      | —                                     | Хук доп. заголовков для конкретного файла         |

Пример с `Content-Disposition` из БД (как в `kami`):

```ts
export const GET = createUploadsRoute({
  headers: async ({ segments, relPath }) => {
    if (segments[0] !== 'files' || segments.length !== 2) return undefined
    const record = await prisma.uploadedFile.findUnique({ where: { path: relPath }, select: { filename: true } })
    if (!record?.filename) return undefined
    return { 'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(record.filename)}` }
  },
})
```

### Поведение

- `200` — файл найден, отдаётся стримом (`createReadStream`), не грузится в память целиком.
- `206` — есть заголовок `Range` (перемотка аудио/видео); `416` — диапазон невыполним.
- `404` — файла нет **или** путь указывает на каталог.
- `403` — попытка выйти за пределы корня; `400` — нулевой байт в пути.

### Защита от path traversal

Используется **нормализация пути с проверкой префикса**, а не проверка сегментов на `..`:
нормализация не зависит от того, как фреймворк разобрал URL, и одинаково ловит `..`,
абсолютные пути и смену диска на Windows. Дополнительно сверяются разыменованные пути
(`realpath`) — симлинк внутри `uploads/`, указывающий наружу, отклоняется, при этом
симлинк на сам корень (том Docker) работает нормально.

Ложных срабатываний нет: файл с легальным именем `..hidden.png` отдаётся.

Всё это покрыто тестами — `src/server/serve-uploads.spec.ts`.

### Заголовки безопасности

`X-Content-Type-Options: nosniff` ставится всегда. Для `image/svg+xml` дополнительно
выставляется `Content-Security-Policy: default-src 'none'; style-src 'unsafe-inline'; sandbox` —
загруженный пользователем SVG это исполняемый документ, внутри может быть `<script>`.
