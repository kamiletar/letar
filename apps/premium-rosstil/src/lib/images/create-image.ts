import type { ImageCategory } from '@/generated/prisma'
import { prisma } from '@/lib/db'
import sharp from 'sharp'

export interface CreateImageParams {
  filename: string
  path: string // относительный путь, например "products/xxx.jpg"
  mimeType: string
  size: number
  category: ImageCategory
  uploadedById?: string
  buffer?: Buffer // для получения размеров изображения
}

export interface ImageRecord {
  id: string
  filename: string
  path: string
  mimeType: string
  size: number
  width: number | null
  height: number | null
  category: ImageCategory
  uploadedById: string | null
  uploadedAt: Date
}

/**
 * Создаёт запись Image в БД.
 * Опционально определяет размеры изображения из buffer.
 */
export async function createImageRecord(params: CreateImageParams): Promise<ImageRecord> {
  const { filename, path, mimeType, size, category, uploadedById, buffer } = params

  let width: number | null = null
  let height: number | null = null

  // Получаем размеры изображения если передан buffer
  if (buffer) {
    try {
      const metadata = await sharp(buffer).metadata()
      width = metadata.width ?? null
      height = metadata.height ?? null
    } catch {
      // Игнорируем ошибки получения размеров
    }
  }

  const image = await prisma.image.create({
    data: {
      filename,
      path,
      mimeType,
      size,
      width,
      height,
      category,
      uploadedById,
    },
  })

  return image
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

/**
 * Формирует URL для доступа к изображению по пути.
 */
export function getImageUrl(path: string): string {
  return `/api/files/${path}`
}

/**
 * Формирует URL для доступа к изображению по ID.
 */
export function getImageUrlById(id: string): string {
  return `/api/images/${id}`
}
