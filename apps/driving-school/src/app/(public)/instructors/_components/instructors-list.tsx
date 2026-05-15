import { prisma } from '@/lib/db'
import { Box, SimpleGrid, Text } from '@chakra-ui/react'
import type { InstructorProfileWhereInput, InstructorVehicleWhereInput } from '@letar/driving-school-db/input'
import type {
  InstructorProfile,
  InstructorVehicle,
  LessonType,
  LicenseCategory,
  PricingOption,
  TransmissionType,
  User,
} from '@letar/driving-school-db/prisma'
import { InstructorCard } from './instructor-card'

// ZenStack v3: явный интерфейс для результата запроса с relations
type InstructorWithRelations = InstructorProfile & {
  user: Pick<User, 'id' | 'name' | 'image'>
  lessonTypes: (LessonType & { pricingOptions: PricingOption[] })[]
  vehicles: InstructorVehicle[]
}

interface SearchParams {
  category?: LicenseCategory
  transmission?: TransmissionType
  city?: string
  minRating?: string
  teachesOnStudentCar?: string
  brand?: string
  model?: string
  sortBy?: string
  page?: string
}

interface InstructorsListProps {
  searchParams: SearchParams
}

export async function InstructorsList({ searchParams }: InstructorsListProps) {
  const {
    category,
    transmission,
    city,
    minRating,
    teachesOnStudentCar,
    brand,
    model,
    sortBy,
    page = '1',
  } = searchParams

  const pageNum = Math.max(1, parseInt(page, 10) || 1)
  const perPage = 12

  // Собираем условия для vehicles отдельно для композиции
  const vehicleConditions: InstructorVehicleWhereInput = {
    isActive: true,
    ...(transmission && { transmission }),
    ...(brand && {
      brand: { contains: brand, mode: 'insensitive' as const },
    }),
    ...(brand &&
      model && {
        model: { contains: model, mode: 'insensitive' as const },
      }),
  }

  // Формируем условия фильтрации (ZenStack v3 типы)
  const where: InstructorProfileWhereInput = {
    isPublic: true,
    // Фильтр по категории
    ...(category && {
      licenseCategories: { has: category },
    }),
    // Фильтр по КПП или авто (если есть условия vehicles)
    ...((transmission || brand) && {
      vehicles: { some: vehicleConditions },
    }),
    // Фильтр по городу
    ...(city && {
      city: { contains: city, mode: 'insensitive' },
    }),
    // Фильтр по минимальному рейтингу
    ...(minRating && {
      averageRating: { gte: parseFloat(minRating) || 0 },
    }),
    // Фильтр "обучает на авто ученика"
    ...(teachesOnStudentCar === 'true' && {
      teachesOnStudentCar: true,
    }),
  }

  // Определяем сортировку (тип выводится автоматически)
  const isSortByPrice = sortBy === 'price'

  const getOrderBy = () => {
    switch (sortBy) {
      case 'experience':
        return [{ experienceStartDate: { sort: 'asc' as const, nulls: 'last' as const } }]
      case 'price':
        // Сортировка по цене — in-memory (Prisma не поддерживает orderBy по вложенным агрегациям)
        return [{ averageRating: { sort: 'desc' as const, nulls: 'last' as const } }]
      case 'rating':
      default:
        return [{ averageRating: { sort: 'desc' as const, nulls: 'last' as const } }, { reviewCount: 'desc' as const }]
    }
  }

  const includeRelations = {
    user: {
      select: {
        id: true,
        name: true,
        image: true,
      },
    },
    lessonTypes: {
      where: { isActive: true },
      include: {
        pricingOptions: {
          where: { isActive: true },
          orderBy: { sortOrder: 'asc' as const },
        },
      },
      orderBy: { sortOrder: 'asc' as const },
      take: 3,
    },
    vehicles: {
      where: { isActive: true },
      orderBy: { isPrimary: 'desc' as const },
      take: 1,
    },
  }

  // Для сортировки по цене загружаем всех и сортируем in-memory
  const [allInstructors, total] = await Promise.all([
    prisma.instructorProfile.findMany({
      where,
      include: includeRelations,
      orderBy: getOrderBy(),
      // При сортировке по цене — пагинация in-memory
      ...(!isSortByPrice && { skip: (pageNum - 1) * perPage, take: perPage }),
    }),
    prisma.instructorProfile.count({ where }),
  ])

  // Сортировка по минимальной цене и пагинация
  let instructors = allInstructors
  if (isSortByPrice) {
    const getMinPrice = (inst: (typeof allInstructors)[0]) => {
      const prices = (inst as unknown as InstructorWithRelations).lessonTypes
        .flatMap((lt) => lt.pricingOptions)
        .map((po) => Number(po.pricePerLesson))
      return prices.length > 0 ? Math.min(...prices) : Infinity
    }
    instructors = [...allInstructors].sort((a, b) => getMinPrice(a) - getMinPrice(b))
    instructors = instructors.slice((pageNum - 1) * perPage, pageNum * perPage)
  }

  if (instructors.length === 0) {
    return (
      <Box textAlign="center" py={12}>
        <Text fontSize="xl" color="fg.muted">
          Инструкторы не найдены
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
        Найдено: {total} {getInstructorWord(total)}
      </Text>

      {/* Сетка карточек */}
      <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} gap={6}>
        {(instructors as unknown as InstructorWithRelations[]).map((instructor) => (
          <InstructorCard key={instructor.id} instructor={instructor} />
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

// Склонение слова "инструктор"
function getInstructorWord(count: number): string {
  const lastDigit = count % 10
  const lastTwoDigits = count % 100

  if (lastTwoDigits >= 11 && lastTwoDigits <= 19) {
    return 'инструкторов'
  }
  if (lastDigit === 1) {
    return 'инструктор'
  }
  if (lastDigit >= 2 && lastDigit <= 4) {
    return 'инструктора'
  }
  return 'инструкторов'
}
