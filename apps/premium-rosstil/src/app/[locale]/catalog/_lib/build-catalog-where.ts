import type { Gender } from '@/generated/prisma'

/** Параметры фильтрации каталога */
export interface CatalogFilterParams {
  category?: string
  gender?: Gender | string
  newCollection?: boolean
  query?: string
  color?: string
  size?: string
  minPrice?: number
  maxPrice?: number
  seller?: string
}

/** Строит Prisma where-условие из параметров фильтрации */
export function buildCatalogWhere(params: CatalogFilterParams): Record<string, unknown> {
  const where: Record<string, unknown> = {}

  if (params.seller) {
    where.seller = { slug: params.seller }
  }

  if (params.category) {
    where.category = { slug: params.category }
  }

  if (params.gender) {
    where.gender = params.gender
  }

  if (params.newCollection) {
    where.isNewCollection = true
  }

  // Поиск по названию и описанию
  if (params.query) {
    where.OR = [
      { name: { contains: params.query, mode: 'insensitive' } },
      { description: { contains: params.query, mode: 'insensitive' } },
    ]
  }

  // Фильтр по цвету
  if (params.color) {
    where.variants = { some: { colorRef: { slug: params.color } } }
  }

  // Фильтр по размеру
  if (params.size) {
    if (where.variants) {
      where.variants = {
        some: {
          ...(where.variants as { some: Record<string, unknown> }).some,
          items: { some: { size: { international: params.size } } },
        },
      }
    } else {
      where.variants = { some: { items: { some: { size: { international: params.size } } } } }
    }
  }

  // Фильтр по цене
  if (params.minPrice !== undefined || params.maxPrice !== undefined) {
    const priceCondition: Record<string, unknown> = {}
    if (params.minPrice !== undefined) {
      priceCondition.gte = params.minPrice
    }
    if (params.maxPrice !== undefined) {
      priceCondition.lte = params.maxPrice
    }

    if (where.variants) {
      const existingVariantsCondition = (where.variants as { some: Record<string, unknown> }).some
      const existingItemsCondition = existingVariantsCondition.items as { some: Record<string, unknown> } | undefined

      if (existingItemsCondition) {
        where.variants = {
          some: {
            ...existingVariantsCondition,
            items: {
              some: {
                ...existingItemsCondition.some,
                price: priceCondition,
              },
            },
          },
        }
      } else {
        where.variants = {
          some: {
            ...existingVariantsCondition,
            items: { some: { price: priceCondition } },
          },
        }
      }
    } else {
      where.variants = { some: { items: { some: { price: priceCondition } } } }
    }
  }

  return where
}
