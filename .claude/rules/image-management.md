---
paths: '**/api/images/**, **/uploads/**, **/*Image*.tsx, **/*image*.ts'
---

# Правила работы с изображениями

## Архитектура

```
uploads/              # НЕ public! Приватная папка
├── products/         # Изображения товаров
├── users/            # Аватары пользователей
└── temp/             # Временные файлы

app/api/images/
├── upload/route.ts   # POST загрузка
├── [id]/route.ts     # GET сервинг
└── delete/route.ts   # DELETE удаление
```

## КРИТИЧНО: uploads/ НЕ в public/

Изображения хранятся в `uploads/` (НЕ `public/`!) и сервируются через API:

```typescript
// ❌ НЕПРАВИЛЬНО — прямой доступ
<img src="/uploads/product.jpg" />

// ✅ ПРАВИЛЬНО — через API
<img src="/api/images/product-123" />
```

## API загрузки

```typescript
// POST /api/images/upload
const formData = new FormData()
formData.append('file', file)
formData.append('folder', 'products')

const response = await fetch('/api/images/upload', {
  method: 'POST',
  body: formData,
})
const { id, url } = await response.json()
```

## Модель Image

```zmodel
model Image {
  id        String   @id @default(cuid())
  filename  String
  mimeType  String
  size      Int
  folder    String   @default("general")
  createdAt DateTime @default(now())

  // Связи
  product   Product? @relation(fields: [productId], references: [id])
  productId String?
}
```

## Оптимизация

- **MUST** использовать `next/image` для отображения
- **SHOULD** генерировать thumbnails при загрузке
- **SHOULD** конвертировать в WebP для веба

```typescript
import Image from 'next/image'

<Image
  src={`/api/images/${imageId}`}
  alt="Product"
  width={400}
  height={300}
  loading="lazy"
  placeholder="blur"
  blurDataURL={blurUrl}
/>
```

## Валидация

```typescript
const MAX_SIZE = 5 * 1024 * 1024 // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']

if (file.size > MAX_SIZE) { throw new Error('Файл слишком большой') }
if (!ALLOWED_TYPES.includes(file.type)) { throw new Error('Неподдерживаемый формат') }
```

## Документация

→ Skill: `image-optimization` для продвинутых паттернов
→ См. `.claude/docs/images.md` для полной документации
