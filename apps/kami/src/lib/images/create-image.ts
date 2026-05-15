import type { ImageCategory } from '@/generated/prisma'
import { prisma } from '@/lib/db'
import sharp from 'sharp'

export interface CreateImageParams {
  filename: string
  path: string // относительный путь, например "blog/post-image.png"
  mimeType: string
  size: number
  category: ImageCategory
  uploadedById?: string
  buffer?: Buffer // для получения размеров и blurDataURL
}

export interface ImageRecord {
  id: string
  filename: string
  path: string
  mimeType: string
  size: number
  width: number | null
  height: number | null
  blurDataURL: string | null
  category: ImageCategory
  uploadedById: string | null
  uploadedAt: Date
}

/**
 * Обрабатывает изображение за один проход Sharp.
 * Возвращает metadata и blurDataURL, декодируя буфер только один раз.
 * Экономит ~30-100MB RAM по сравнению с отдельными вызовами.
 */
export async function processImageBuffer(buffer: Buffer): Promise<{
  width: number | null
  height: number | null
  blurDataURL: string | null
}> {
  try {
    // Создаём единый Sharp instance — декодирование происходит один раз
    const image = sharp(buffer)

    // Получаем metadata (использует уже декодированный буфер)
    const metadata = await image.metadata()

    // Создаём blur на основе того же instance (клонирует внутренний state)
    const blurBuffer = await image
      .clone() // Клонируем, чтобы не мутировать оригинал
      .resize(10, 10, { fit: 'inside' })
      .blur(1)
      .webp({ quality: 20 })
      .toBuffer()

    return {
      width: metadata.width ?? null,
      height: metadata.height ?? null,
      blurDataURL: `data:image/webp;base64,${blurBuffer.toString('base64')}`,
    }
  } catch {
    return { width: null, height: null, blurDataURL: null }
  }
}

/**
 * Создаёт запись Image в БД.
 * Определяет размеры и генерирует blurDataURL из buffer за один проход Sharp.
 */
export async function createImageRecord(params: CreateImageParams): Promise<ImageRecord> {
  const { filename, path, mimeType, size, category, uploadedById, buffer } = params

  let width: number | null = null
  let height: number | null = null
  let blurDataURL: string | null = null

  // Обрабатываем изображение за один проход Sharp
  if (buffer) {
    const result = await processImageBuffer(buffer)
    width = result.width
    height = result.height
    blurDataURL = result.blurDataURL
  }

  const image = await prisma.image.create({
    data: {
      filename,
      path,
      mimeType,
      size,
      width,
      height,
      blurDataURL,
      category,
      uploadedById,
    },
  })

  return image
}

/**
 * Обновляет запись Image — добавляет width/height/blurDataURL если отсутствуют.
 * Использует единый проход Sharp для экономии памяти.
 */
export async function updateImageMetadata(id: string, buffer: Buffer): Promise<ImageRecord> {
  const { width, height, blurDataURL } = await processImageBuffer(buffer)

  return prisma.image.update({
    where: { id },
    data: {
      width,
      height,
      blurDataURL,
    },
  })
}

/**
 * Удаляет запись Image из БД по ID.
 */
export async function deleteImageRecord(id: string): Promise<void> {
  await prisma.image.delete({
    where: { id },
  })
}

/**
 * Удаляет запись Image из БД по пути.
 */
export async function deleteImageByPath(path: string): Promise<void> {
  await prisma.image.delete({
    where: { path },
  })
}

/**
 * Получает запись Image по ID.
 */
export async function getImageById(id: string): Promise<ImageRecord | null> {
  return prisma.image.findUnique({
    where: { id },
  })
}

/**
 * Получает запись Image по пути.
 */
export async function getImageByPath(path: string): Promise<ImageRecord | null> {
  return prisma.image.findUnique({
    where: { path },
  })
}

// Реэкспорт утилит для URL — используй напрямую из get-image-url.ts в клиентских компонентах
export { getImageUrl, getImageUrlById } from './get-image-url'
