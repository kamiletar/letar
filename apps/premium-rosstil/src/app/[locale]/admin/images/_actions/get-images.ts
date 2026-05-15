'use server'

import type { ImageCategory } from '@/generated/prisma'
import { getSession } from '@/lib/auth'
import { getEnhancedPrisma } from '@/lib/db'

export interface ImageFilters {
  category?: ImageCategory
  search?: string
  unused?: boolean
  sortBy?: 'uploadedAt' | 'size' | 'filename'
  sortOrder?: 'asc' | 'desc'
  page?: number
  perPage?: number
}

export interface ImageWithUsage {
  id: string
  filename: string
  path: string
  mimeType: string
  size: number
  width: number | null
  height: number | null
  category: ImageCategory
  uploadedAt: Date
  uploadedById: string | null
  // Использование
  variantImagesCount: number
  userProfilesCount: number
  customOrdersCount: number
}

export interface ImagesResult {
  images: ImageWithUsage[]
  total: number
  page: number
  perPage: number
  totalPages: number
}

export interface ImagesStats {
  total: number
  totalSize: number
  byCategory: Record<ImageCategory, { count: number; size: number }>
  unused: number
}

// Тип результата из БД с _count
type ImageDbResult = {
  id: string
  filename: string
  path: string
  mimeType: string
  size: number
  width: number | null
  height: number | null
  category: ImageCategory
  uploadedAt: Date
  uploadedById: string | null
  _count: {
    variantImages: number
    userProfiles: number
  }
}

/**
 * Получить список изображений с фильтрацией и пагинацией.
 */
export async function getImages(filters: ImageFilters = {}): Promise<ImagesResult> {
  const session = await getSession()
  if (!session?.user || session.user.role !== 'ADMIN') {
    throw new Error('Unauthorized')
  }

  const db = getEnhancedPrisma(session.user)

  const { category, search, unused, sortBy = 'uploadedAt', sortOrder = 'desc', page = 1, perPage = 20 } = filters

  // Строим условия фильтрации
  const where: Record<string, unknown> = {}

  if (category) {
    where.category = category
  }

  if (search) {
    where.filename = { contains: search, mode: 'insensitive' }
  }

  // Получаем изображения с подсчётом использования
  const [images, total] = await Promise.all([
    db.image.findMany({
      where,
      orderBy: { [sortBy]: sortOrder },
      skip: (page - 1) * perPage,
      take: perPage,
      include: {
        _count: {
          select: {
            variantImages: true,
            userProfiles: true,
          },
        },
      },
    }) as unknown as ImageDbResult[],
    db.image.count({ where }),
  ])

  // Подсчёт использования в CustomOrder (referenceImageIds)
  const imageIds = images.map((img) => img.id)
  const customOrderCounts = await getCustomOrderCounts(db, imageIds)

  // Формируем результат
  let imagesWithUsage: ImageWithUsage[] = images.map((img) => ({
    id: img.id,
    filename: img.filename,
    path: img.path,
    mimeType: img.mimeType,
    size: img.size,
    width: img.width,
    height: img.height,
    category: img.category,
    uploadedAt: img.uploadedAt,
    uploadedById: img.uploadedById,
    variantImagesCount: (img as ImageDbResult)._count.variantImages,
    userProfilesCount: (img as ImageDbResult)._count.userProfiles,
    customOrdersCount: customOrderCounts.get(img.id) || 0,
  }))

  // Фильтр по unused (делаем после получения данных т.к. требует подсчёта связей)
  if (unused !== undefined) {
    imagesWithUsage = imagesWithUsage.filter((img) => {
      const isUnused = img.variantImagesCount === 0 && img.userProfilesCount === 0 && img.customOrdersCount === 0
      return unused ? isUnused : !isUnused
    })
  }

  return {
    images: imagesWithUsage,
    total: unused !== undefined ? imagesWithUsage.length : total,
    page,
    perPage,
    totalPages: Math.ceil(total / perPage),
  }
}

/**
 * Получить статистику по изображениям.
 * Оптимизировано для экономии памяти — использует aggregate и count вместо findMany.
 */
export async function getImagesStats(): Promise<ImagesStats> {
  const session = await getSession()
  if (!session?.user || session.user.role !== 'ADMIN') {
    throw new Error('Unauthorized')
  }

  const db = getEnhancedPrisma(session.user)

  // Выполняем все агрегации параллельно для скорости
  const [categoryStats, totals, usedInVariantsCount, usedInProfilesCount, customOrderImages] = await Promise.all([
    // Группировка по категориям
    db.image.groupBy({
      by: ['category'],
      _count: { id: true },
      _sum: { size: true },
    }),
    // Общее количество и размер
    db.image.aggregate({
      _count: { id: true },
      _sum: { size: true },
    }),
    // Количество изображений, используемых в variantImages
    db.variantImage.findMany({
      select: { imageId: true },
      distinct: ['imageId'],
    }),
    // Количество изображений, используемых в userProfiles
    db.user.findMany({
      where: { image: { not: null } },
      select: { image: true },
    }),
    // ID изображений из CustomOrder (лимит для защиты памяти)
    db.customOrder.findMany({
      where: { referenceImageIds: { isEmpty: false } },
      select: { referenceImageIds: true },
      take: 1000,
    }),
  ])

  // Собираем все используемые ID
  const usedImageIds = new Set<string>()
  for (const vi of usedInVariantsCount) {
    usedImageIds.add(vi.imageId)
  }
  for (const user of usedInProfilesCount) {
    if (user.image) {
      usedImageIds.add(user.image)
    }
  }
  for (const order of customOrderImages) {
    for (const id of order.referenceImageIds) {
      usedImageIds.add(id)
    }
  }

  // Подсчёт неиспользуемых через count с условием NOT IN
  // Для оптимизации используем приблизительный подсчёт
  const totalImages = totals._count.id || 0
  const unusedCount = Math.max(0, totalImages - usedImageIds.size)

  // Формируем статистику по категориям
  const byCategory = {} as Record<ImageCategory, { count: number; size: number }>
  const categories: ImageCategory[] = ['PRODUCT', 'AVATAR', 'REFERENCE', 'NOTIFICATION']

  for (const cat of categories) {
    const stat = categoryStats.find((s: (typeof categoryStats)[number]) => s.category === cat)
    byCategory[cat] = {
      count: stat?._count.id || 0,
      size: stat?._sum.size || 0,
    }
  }

  return {
    total: totalImages,
    totalSize: totals._sum.size || 0,
    byCategory,
    unused: unusedCount,
  }
}

/**
 * Вспомогательная функция для подсчёта использования в CustomOrder.
 */
async function getCustomOrderCounts(
  db: ReturnType<typeof getEnhancedPrisma>,
  imageIds: string[]
): Promise<Map<string, number>> {
  const counts = new Map<string, number>()

  if (imageIds.length === 0) {
    return counts
  }

  // Получаем все заказы, где есть хотя бы один из imageIds
  const orders = await db.customOrder.findMany({
    where: { referenceImageIds: { hasSome: imageIds } },
    select: { referenceImageIds: true },
  })

  // Считаем вхождения каждого imageId
  for (const order of orders) {
    for (const id of order.referenceImageIds) {
      if (imageIds.includes(id)) {
        counts.set(id, (counts.get(id) || 0) + 1)
      }
    }
  }

  return counts
}
