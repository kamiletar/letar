# Image Processing

## Sharp для обработки

```bash
bun add sharp
```

## Генерация thumbnails

```typescript
import { join } from 'path'
import sharp from 'sharp'

interface ThumbnailOptions {
  width: number
  height: number
  fit?: 'cover' | 'contain' | 'fill'
  quality?: number
}

export async function generateThumbnail(
  inputPath: string,
  outputPath: string,
  options: ThumbnailOptions
): Promise<void> {
  await sharp(inputPath)
    .resize(options.width, options.height, {
      fit: options.fit || 'cover',
      position: 'center',
    })
    .webp({ quality: options.quality || 80 })
    .toFile(outputPath)
}

// Пример использования
await generateThumbnail('uploads/products/original.jpg', 'uploads/products/thumb.webp', { width: 400, height: 300 })
```

## Конвертация в WebP

```typescript
export async function convertToWebP(inputPath: string, quality: number = 80): Promise<Buffer> {
  return sharp(inputPath).webp({ quality }).toBuffer()
}

// С сохранением в файл
export async function convertToWebPFile(inputPath: string, outputPath: string, quality: number = 80): Promise<void> {
  await sharp(inputPath).webp({ quality }).toFile(outputPath)
}
```

## Оптимизация при загрузке

```typescript
import sharp from 'sharp'

interface ProcessedImage {
  original: Buffer
  thumbnail: Buffer
  webp: Buffer
  metadata: {
    width: number
    height: number
    format: string
  }
}

export async function processUploadedImage(buffer: Buffer): Promise<ProcessedImage> {
  const image = sharp(buffer)
  const metadata = await image.metadata()

  // Оригинал (с оптимизацией)
  const original = await image.jpeg({ quality: 85, mozjpeg: true }).toBuffer()

  // Thumbnail
  const thumbnail = await sharp(buffer).resize(400, 300, { fit: 'cover' }).webp({ quality: 80 }).toBuffer()

  // WebP версия
  const webp = await sharp(buffer).webp({ quality: 80 }).toBuffer()

  return {
    original,
    thumbnail,
    webp,
    metadata: {
      width: metadata.width || 0,
      height: metadata.height || 0,
      format: metadata.format || 'unknown',
    },
  }
}
```

## Watermark

```typescript
export async function addWatermark(imagePath: string, watermarkPath: string, outputPath: string): Promise<void> {
  await sharp(imagePath)
    .composite([
      {
        input: watermarkPath,
        gravity: 'southeast',
        blend: 'over',
      },
    ])
    .toFile(outputPath)
}
```

## Blur placeholder (LQIP)

```typescript
export async function generateBlurPlaceholder(imagePath: string): Promise<string> {
  const buffer = await sharp(imagePath).resize(10, 10, { fit: 'inside' }).blur().toBuffer()

  return `data:image/jpeg;base64,${buffer.toString('base64')}`
}
```
