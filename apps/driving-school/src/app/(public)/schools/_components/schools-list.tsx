import { prisma } from '@/lib/db'
import { parseOrganizationMetadata } from '@/lib/organization-metadata'
import { Box, SimpleGrid, Text } from '@chakra-ui/react'
import type { LicenseCategory } from '@letar/driving-school-db/prisma'
import { cache } from 'react'
import { SchoolCard } from './school-card'

/**
 * Кэшированный запрос публичных школ.
 * React cache() дедуплицирует запрос в рамках одного рендер-запроса —
 * page.tsx и SchoolsList используют одни и те же данные.
 */
const getPublicSchools = cache(() =>
  prisma.organization.findMany({
    where: { isPublic: true },
    include: {
      _count: {
        select: {
          members: {
            where: { role: 'instructor' },
          },
        },
      },
    },
    orderBy: [{ averageRating: { sort: 'desc', nulls: 'last' } }, { reviewCount: 'desc' }],
  })
)

/** Получить список уникальных городов из публичных школ */
export async function getAvailableCities(): Promise<string[]> {
  const schools = await getPublicSchools()
  const allCities: string[] = schools.flatMap((s) => parseOrganizationMetadata(s.metadata).cities)
  return [...new Set(allCities)].sort()
}

/** Интерфейс для школы с metadata и _count */
interface OrganizationWithMetadata {
  id: string
  name: string
  logo: string | null
  description: string | null
  metadata: string | null
  phone: string | null
  email: string | null
  website: string | null
  isPublic: boolean
  averageRating: number | null
  reviewCount: number
  createdAt: Date
  updatedAt: Date
  _count: { members: number }
}

/** Интерфейс для школы с распарсенными полями для SchoolCard */
export interface SchoolWithParsedMetadata {
  id: string
  name: string
  logo: string | null
  description: string | null
  cities: string[]
  phone: string | null
  email: string | null
  website: string | null
  licenseCategories: LicenseCategory[]
  isPublic: boolean
  averageRating: number | null
  reviewCount: number
  createdAt: Date
  updatedAt: Date
  _count: { members: number }
}

interface SearchParams {
  category?: LicenseCategory
  city?: string
  minRating?: string
  page?: string
}

interface SchoolsListProps {
  searchParams: SearchParams
}

export async function SchoolsList({ searchParams }: SchoolsListProps) {
  const { category, city, minRating, page = '1' } = searchParams

  const pageNum = Math.max(1, parseInt(page, 10) || 1)
  const perPage = 12

  // Кэшированный запрос (дедуплицируется с getAvailableCities в page.tsx)
  const allSchools = await getPublicSchools()

  // Парсим metadata и фильтруем по city и category
  const filteredSchools = (allSchools as unknown as OrganizationWithMetadata[])
    .map((school) => {
      const metadata = parseOrganizationMetadata(school.metadata)
      return {
        ...school,
        cities: metadata.cities,
        licenseCategories: metadata.licenseCategories,
      } as SchoolWithParsedMetadata
    })
    .filter((school) => {
      // Фильтр по минимальному рейтингу
      if (minRating) {
        const min = parseFloat(minRating) || 0
        if (!school.averageRating || school.averageRating < min) {
          return false
        }
      }
      // Фильтр по городу
      if (city && !school.cities.includes(city)) {
        return false
      }
      // Фильтр по категории
      if (category && !school.licenseCategories.includes(category)) {
        return false
      }
      return true
    })

  const total = filteredSchools.length

  // Пагинация
  const schools = filteredSchools.slice((pageNum - 1) * perPage, pageNum * perPage)

  if (schools.length === 0) {
    return (
      <Box textAlign="center" py={12}>
        <Text fontSize="xl" color="fg.muted">
          Автошколы не найдены
        </Text>
        <Text color="fg.muted" mt={2}>
          Попробуйте изменить параметры поиска
        </Text>
      </Box>
    )
  }

  const totalPages = Math.ceil(total / perPage)

  return (
    <Box>
      {/* Счётчик результатов */}
      <Text color="fg.muted" mb={4}>
        Найдено: {total} {getSchoolWord(total)}
      </Text>

      {/* Сетка карточек */}
      <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} gap={6}>
        {schools.map((school) => (
          <SchoolCard key={school.id} school={school} />
        ))}
      </SimpleGrid>

      {/* Пагинация */}
      {totalPages > 1 && (
        <Box textAlign="center" mt={8}>
          <Text color="fg.muted">
            Страница {pageNum} из {totalPages}
          </Text>
        </Box>
      )}
    </Box>
  )
}

// Склонение слова "школа"
function getSchoolWord(count: number): string {
  const lastDigit = count % 10
  const lastTwoDigits = count % 100

  if (lastTwoDigits >= 11 && lastTwoDigits <= 19) {
    return 'школ'
  }
  if (lastDigit === 1) {
    return 'школа'
  }
  if (lastDigit >= 2 && lastDigit <= 4) {
    return 'школы'
  }
  return 'школ'
}
