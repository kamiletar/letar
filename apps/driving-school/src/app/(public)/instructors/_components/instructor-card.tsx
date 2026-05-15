import { SocialProofBadges } from '@/app/_components/social-proof-badges'
import { formatExperience } from '@/lib/date-utils'
import { getCategoryDescription } from '@/lib/license-categories/license-categories'
import { Avatar, Badge, Button, Card, HStack, Stack, Text } from '@chakra-ui/react'
import type {
  InstructorProfile,
  InstructorVehicle,
  LessonType,
  LicenseCategory,
  PricingOption,
  User,
} from '@letar/driving-school-db/prisma'
import { RatingDisplay } from '@letar/ui'
import Link from 'next/link'
import { memo } from 'react'
import { LuCar, LuMapPin } from 'react-icons/lu'

interface InstructorCardProps {
  instructor: InstructorProfile & {
    user: Pick<User, 'id' | 'name' | 'image'>
    lessonTypes: (LessonType & { pricingOptions: PricingOption[] })[]
    vehicles: InstructorVehicle[]
  }
}

// Мемоизированный компонент карточки инструктора
export const InstructorCard = memo(function InstructorCard({ instructor }: InstructorCardProps) {
  const { user, licenseCategories, workingAreas, averageRating, reviewCount, vehicles } = instructor

  // Основной автомобиль (первый в списке, отсортированном по isPrimary)
  const primaryVehicle = vehicles[0]

  // Формируем текст рабочих зон для карточки (упрощённо - только названия городов)
  const workingAreasText = (() => {
    if (!workingAreas || !Array.isArray(workingAreas) || workingAreas.length === 0) {
      return null
    }
    const areas = workingAreas as Array<{ cityName: string; districts: string[] }>
    if (areas.length === 1) {
      return areas[0].cityName
    }
    return areas.map((a) => a.cityName).join(', ')
  })()

  // Минимальная цена занятия (берём минимум из всех pricingOptions всех lessonTypes)
  const allPrices = instructor.lessonTypes.flatMap((lt) => lt.pricingOptions.map((po) => Number(po.pricePerLesson)))
  const minPrice = allPrices.length > 0 ? Math.min(...allPrices) : null

  // Показываем первые 3 категории (защита от null/undefined/non-array)
  const categoriesArray = Array.isArray(licenseCategories) ? licenseCategories : []
  const displayCategories = categoriesArray.slice(0, 3)
  const hasMoreCategories = categoriesArray.length > 3

  return (
    <Card.Root overflow="hidden" transition="all 0.2s" _hover={{ transform: 'translateY(-4px)', shadow: 'lg' }}>
      <Card.Body gap={4}>
        {/* Шапка с аватаром и рейтингом */}
        <HStack justify="space-between" align="flex-start">
          <HStack gap={3}>
            <Avatar.Root size="lg">
              <Avatar.Image src={user.image ?? undefined} alt={user.name || 'Instructor'} />
              <Avatar.Fallback>{user.name?.charAt(0) || '?'}</Avatar.Fallback>
            </Avatar.Root>
            <Stack gap={0}>
              <Text fontWeight="semibold" fontSize="lg">
                {user.name || 'Без имени'}
              </Text>
              {instructor.experienceStartDate && (
                <Text fontSize="sm" color="fg.muted">
                  Опыт: {formatExperience(instructor.experienceStartDate)}
                </Text>
              )}
            </Stack>
          </HStack>
          <RatingDisplay rating={averageRating} reviewCount={reviewCount} size="sm" />
        </HStack>

        {/* Social Proof Badges */}
        <SocialProofBadges
          averageRating={averageRating}
          reviewCount={reviewCount}
          experienceStartDate={instructor.experienceStartDate}
          isVerified={instructor.isPublic}
        />

        {/* Локация */}
        {workingAreasText && (
          <HStack color="fg.muted" fontSize="sm">
            <LuMapPin size={16} />
            <Text>{workingAreasText}</Text>
          </HStack>
        )}

        {/* Авто */}
        {primaryVehicle && (
          <HStack color="fg.muted" fontSize="sm">
            <LuCar size={16} />
            <Text>
              {primaryVehicle.brand} {primaryVehicle.model}
              <Text as="span" color="fg.subtle">
                {' '}
                ({primaryVehicle.transmission === 'MANUAL' ? 'механика' : 'автомат'})
              </Text>
            </Text>
          </HStack>
        )}

        {/* Категории */}
        {displayCategories.length > 0 && (
          <HStack flexWrap="wrap" gap={2}>
            {displayCategories.map((cat) => (
              <Badge
                key={cat}
                colorPalette="blue"
                variant="subtle"
                title={getCategoryDescription(cat as LicenseCategory)}
              >
                {cat}
              </Badge>
            ))}
            {hasMoreCategories && <Badge variant="outline">+{licenseCategories.length - 3}</Badge>}
          </HStack>
        )}

        {/* Цена */}
        {minPrice !== null && (
          <Text fontWeight="medium" color="fg">
            от {minPrice.toLocaleString('ru-RU')} ₽ / занятие
          </Text>
        )}
      </Card.Body>

      <Card.Footer pt={0}>
        <Button asChild colorPalette="brand" variant="outline" flex={1}>
          <Link href={`/instructors/${instructor.id}`}>Подробнее</Link>
        </Button>
      </Card.Footer>
    </Card.Root>
  )
})
