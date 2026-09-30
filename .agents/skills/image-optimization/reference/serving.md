# Image Serving

## GET /api/images/[id]

```typescript
// app/api/images/[id]/route.ts
import { readFile, stat } from 'fs/promises'
import { NextRequest, NextResponse } from 'next/server'
import { join } from 'path'

const UPLOAD_DIR = process.env.UPLOAD_DIR || 'uploads'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  // Получить метаданные из БД
  const image = await db.image.findUnique({ where: { id } })
  if (!image) {
    return NextResponse.json({ error: 'Изображение не найдено' }, { status: 404 })
  }

  const filePath = join(UPLOAD_DIR, image.folder, image.filename)

  try {
    const [file, stats] = await Promise.all([readFile(filePath), stat(filePath)])

    return new NextResponse(file, {
      headers: {
        'Content-Type': image.mimeType,
        'Content-Length': stats.size.toString(),
        'Cache-Control': 'public, max-age=31536000, immutable',
        ETag: `"${image.id}"`,
      },
    })
  } catch {
    return NextResponse.json({ error: 'Файл не найден' }, { status: 404 })
  }
}
```

## Поддержка форматов (WebP fallback)

```typescript
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const acceptHeader = request.headers.get('accept') || ''
  const supportsWebP = acceptHeader.includes('image/webp')

  const image = await db.image.findUnique({ where: { id } })
  if (!image) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // Пробуем WebP версию если поддерживается
  let filePath = join(UPLOAD_DIR, image.folder, image.filename)
  let mimeType = image.mimeType

  if (supportsWebP) {
    const webpPath = filePath.replace(/\.[^.]+$/, '.webp')
    try {
      await stat(webpPath)
      filePath = webpPath
      mimeType = 'image/webp'
    } catch {
      // WebP не существует, используем оригинал
    }
  }

  const file = await readFile(filePath)
  return new NextResponse(file, {
    headers: {
      'Content-Type': mimeType,
      'Cache-Control': 'public, max-age=31536000, immutable',
      Vary: 'Accept', // Важно для CDN
    },
  })
}
```

## Resize on-the-fly

```typescript
// app/api/images/[id]/route.ts?w=400&h=300

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { searchParams } = new URL(request.url)
  const width = parseInt(searchParams.get('w') || '0')
  const height = parseInt(searchParams.get('h') || '0')

  const image = await db.image.findUnique({ where: { id } })
  if (!image) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const filePath = join(UPLOAD_DIR, image.folder, image.filename)
  let buffer = await readFile(filePath)

  // Resize если указаны размеры
  if (width > 0 || height > 0) {
    buffer = await sharp(buffer)
      .resize(width || undefined, height || undefined, { fit: 'inside' })
      .webp({ quality: 80 })
      .toBuffer()
  }

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'image/webp',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  })
}
```

## Использование с next/image

```tsx
import Image from 'next/image'

// Через API
<Image
  src={`/api/images/${imageId}`}
  alt="Product"
  width={400}
  height={300}
  loading="lazy"
/>

// С blur placeholder
<Image
  src={`/api/images/${imageId}`}
  alt="Product"
  width={400}
  height={300}
  placeholder="blur"
  blurDataURL={blurPlaceholder}
/>
```
