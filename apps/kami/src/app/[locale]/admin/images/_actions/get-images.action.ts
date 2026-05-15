'use server'

import type { ImageCategory } from '@/generated/prisma'
import { getSession, isAdmin } from '@/lib/auth'
import { getEnhancedPrisma } from '@/lib/db'

export interface GetImagesParams {
  page?: number
  pageSize?: number
  search?: string
  category?: ImageCategory
}

export interface ImageItem {
  id: string
  filename: string
  path: string
  mimeType: string
  size: number
  width: number | null
  height: number | null
  blurDataURL: string | null
  category: ImageCategory
  uploadedAt: Date
  uploadedById: string | null
}

export interface GetImagesResult {
  images: ImageItem[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

/**
 * Получить список изображений с фильтрацией и пагинацией.
 */
export async function getImages(params: GetImagesParams = {}): Promise<GetImagesResult> {
  const admin = await isAdmin()
  if (!admin) {
    throw new Error('Доступ запрещён')
  }

  const session = await getSession()
  const db = getEnhancedPrisma(session?.user)

  const { page = 1, pageSize = 20, search, category } = params

  // Условия фильтрации
  const where: Record<string, unknown> = {}

  if (category) {
    where.category = category
  }

  if (search) {
    where.filename = { contains: search, mode: 'insensitive' }
  }

  // Получаем изображения с пагинацией
  const [images, total] = await Promise.all([
    db.image.findMany({
      where,
      orderBy: { uploadedAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    db.image.count({ where }),
  ])

  return {
    images,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  }
}
