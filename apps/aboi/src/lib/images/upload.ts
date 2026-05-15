import { randomUUID } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'
import { prismaAuth } from '../prisma'

const UPLOADS_ROOT = path.join(process.cwd(), 'uploads')
const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp'])
const MAX_BYTES = 10 * 1024 * 1024 // 10 MB

export interface UploadInput {
  buffer: Buffer
  mimeType: string
  originalName: string
  category: string
  alt?: string
  uploadedById?: string
}

export interface UploadedImage {
  id: string
  path: string
  url: string
  width: number | null
  height: number | null
  mimeType: string
  size: number
}

/**
 * Сохраняет загруженное изображение в `apps/aboi/uploads/<category>/<id>.<ext>`,
 * читает width/height через sharp, создаёт запись Image в БД.
 *
 * Файлы доступны через `GET /api/files/<category>/<id>.<ext>`.
 */
export async function createImageRecord(input: UploadInput): Promise<UploadedImage> {
  if (!ALLOWED_MIME.has(input.mimeType)) {
    throw new Error(`Недопустимый тип файла: ${input.mimeType}. Разрешены: jpg, png, webp.`)
  }

  if (input.buffer.byteLength > MAX_BYTES) {
    throw new Error(`Файл слишком большой: ${(input.buffer.byteLength / 1024 / 1024).toFixed(1)} МБ. Максимум 10 МБ.`)
  }

  // randomUUID — не cuid (Prisma добавит свой при create), но безопасное имя файла
  const id = randomUUID()
  const ext = extFromMime(input.mimeType)
  const filename = `${id}.${ext}`
  const relPath = `${input.category}/${filename}`
  const absPath = path.join(UPLOADS_ROOT, relPath)

  // Метаданные через sharp до сохранения — заодно валидируем что файл реально картинка
  let width: number | null = null
  let height: number | null = null
  try {
    const meta = await sharp(input.buffer).metadata()
    width = meta.width ?? null
    height = meta.height ?? null
  } catch {
    throw new Error('Не удалось распарсить изображение — файл повреждён или не картинка.')
  }

  await mkdir(path.dirname(absPath), { recursive: true })
  await writeFile(absPath, input.buffer)

  const image = await prismaAuth.image.create({
    data: {
      id,
      category: input.category,
      filename,
      path: relPath,
      mimeType: input.mimeType,
      size: input.buffer.byteLength,
      width,
      height,
      alt: input.alt,
      uploadedById: input.uploadedById,
    },
  })

  return {
    id: image.id,
    path: image.path,
    url: `/api/files/${image.path}`,
    width,
    height,
    mimeType: image.mimeType,
    size: image.size,
  }
}

function extFromMime(mime: string): string {
  switch (mime) {
    case 'image/jpeg':
      return 'jpg'
    case 'image/png':
      return 'png'
    case 'image/webp':
      return 'webp'
    default:
      return 'bin'
  }
}
