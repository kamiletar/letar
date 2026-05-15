# @letar/image-upload

Компоненты загрузки изображений с drag-and-drop, превью и интеграцией с API.

## Установка

Библиотека уже включена в монорепо. Добавьте в `tsconfig.json` приложения:

```json
{
  "references": [{ "path": "../../libs/image-upload" }]
}
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

## Хук useImageUpload

```tsx
import { useImageUpload } from '@letar/image-upload'

function CustomUploader() {
  const { upload, uploadMany, files, isUploading, getUploadedImages } = useImageUpload({
    category: 'PRODUCT',
    uploadEndpoint: '/api/upload',
    onUploadSuccess: (image) => console.log('Uploaded:', image.id),
    onUploadError: (error) => console.error(error),
  })

  return <input type="file" multiple onChange={(e) => e.target.files && uploadMany(e.target.files)} />
}
```

## API

### ImageUploadField Props

| Prop           | Type                           | Default   | Description      |
| -------------- | ------------------------------ | --------- | ---------------- |
| `value`        | `string \| null`               | -         | ID изображения   |
| `onChange`     | `(id: string \| null) => void` | -         | Callback         |
| `label`        | `string`                       | -         | Название поля    |
| `error`        | `string`                       | -         | Ошибка валидации |
| `required`     | `boolean`                      | `false`   | Обязательное     |
| `disabled`     | `boolean`                      | `false`   | Отключено        |
| `category`     | `ImageCategory`                | `'OTHER'` | Категория        |
| `colorPalette` | `string`                       | `'blue'`  | Цветовая схема   |

### BulkImageUpload Props

| Prop        | Type                      | Default   | Description           |
| ----------- | ------------------------- | --------- | --------------------- |
| `value`     | `string[]`                | `[]`      | Массив ID изображений |
| `onChange`  | `(ids: string[]) => void` | -         | Callback              |
| `maxImages` | `number`                  | -         | Максимум изображений  |
| `title`     | `string`                  | -         | Заголовок             |
| `category`  | `ImageCategory`           | `'OTHER'` | Категория             |

### ImageCategory

```typescript
type ImageCategory = 'PRODUCT' | 'MANDALA' | 'THUMBNAIL' | 'WATERMARK' | 'AVATAR' | 'OTHER'
```

## API Endpoints

Компоненты работают с API:

- `POST /api/upload` — загрузка файла
- `GET /api/images/{id}` — получение изображения

## Зависимости

- `@chakra-ui/react` >= 3.0.0
- `react` >= 18.0.0
- `react-icons` (для иконок)
