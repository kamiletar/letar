import type { ImageCategory } from '@/generated/prisma'
import { prisma } from '@/lib/db'
import { createImageRepository, processUploadImage } from '@letar/image-upload/server'

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
 * Экспортируется отдельно от репозитория — используется вызывающим кодом,
 * которому нужны только метаданные, без похода в БД.
 */
export async function processImageBuffer(buffer: Buffer): Promise<{
  width: number | null
  height: number | null
  blurDataURL: string | null
}> {
  try {
    const { width, height, blurDataURL } = await processUploadImage(buffer, { blurDataURL: true })
    return { width, height, blurDataURL }
  } catch {
    return { width: null, height: null, blurDataURL: null }
  }
}

const repository = createImageRepository<ImageRecord, ImageCategory>(prisma.image)

export const {
  createImageRecord,
  updateImageMetadata,
  deleteImageRecord,
  deleteImageByPath,
  getImageById,
  getImageByPath,
} = repository

// Реэкспорт утилит для URL — используй напрямую из get-image-url.ts в клиентских компонентах
export { getImageUrl, getImageUrlById } from './get-image-url'
