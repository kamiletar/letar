/**
 * Хелперы для работы с городами.
 *
 * getCityBySlug — кэшированный поиск города по slug
 * getCities — список всех городов
 */

import { prisma } from '@/lib/db'
import { cache } from 'react'

export interface CityData {
  id: string
  name: string
  slug: string
  telegramLink: string | null
}

/** Получить город по slug (кэшировано в рамках запроса) */
export const getCityBySlug = cache(async (slug: string): Promise<CityData | null> => {
  return prisma.city.findUnique({
    where: { slug },
    select: { id: true, name: true, slug: true, telegramLink: true },
  })
})

/** Получить все города */
export const getCities = cache(async (): Promise<CityData[]> => {
  return prisma.city.findMany({
    select: { id: true, name: true, slug: true, telegramLink: true },
    orderBy: { name: 'asc' },
  })
})
