---
name: image-optimization
description: |
  Загрузка, обработка и сервинг изображений. Используй при:
  - Работе с API загрузки изображений
  - Оптимизации изображений (WebP, thumbnails)
  - Настройке CDN кэширования
  - Работе с папкой uploads/
---

# Image Optimization

Полный цикл работы с изображениями: загрузка, обработка, оптимизация, сервинг.

## Когда использовать

- Создание API загрузки изображений
- Оптимизация изображений для веба
- Настройка CDN и кэширования
- Работа с папкой `uploads/`

## Критичные правила

- **MUST** хранить изображения в `uploads/`, **NEVER** в `public/`
- **MUST** сервировать через API `/api/images/[id]`
- **SHOULD** генерировать thumbnails при загрузке
- **SHOULD** конвертировать в WebP для веба

## Быстрый старт

```typescript
// POST /api/images/upload
const formData = new FormData()
formData.append('file', file)
formData.append('folder', 'products')

const { id, url } = await fetch('/api/images/upload', {
  method: 'POST',
  body: formData,
}).then((r) => r.json())
```

## Отображение

```tsx
import Image from 'next/image'
;<Image src={`/api/images/${imageId}`} alt="Product" width={400} height={300} loading="lazy" />
```

## Reference файлы

- `reference/upload-api.md` — API загрузки изображений
- `reference/image-processing.md` — обработка с Sharp
- `reference/serving.md` — сервинг через API
- `reference/optimization.md` — оптимизация для веба
- `reference/cdn-caching.md` — CDN и кэширование
