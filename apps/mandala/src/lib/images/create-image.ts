import type { ImageCategory } from '@/generated/prisma'
import { prisma } from '@/lib/db'
import { createImageRepository } from '@letar/image-upload/server'

export interface CreateImageParams {
  filename: string
  path: string // относительный путь, например "mandalas/anahata.png"
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
