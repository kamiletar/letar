import { getCategoryDescription } from '@/lib/license-categories/license-categories'
import { Avatar, Badge, Button, Card, HStack, Stack, Text } from '@chakra-ui/react'
import type { LicenseCategory } from '@letar/driving-school-db/prisma'
import { formatPhone } from '@letar/format-utils'
import { RatingDisplay } from '@letar/ui'
import Link from 'next/link'
import { memo } from 'react'
import { LuMapPin, LuPhone, LuUsers } from 'react-icons/lu'
import type { SchoolWithParsedMetadata } from './schools-list'

interface SchoolCardProps {
  school: SchoolWithParsedMetadata
}

/** Карточка автошколы с мемоизацией для оптимизации списка */
export const SchoolCard = memo(function SchoolCard({ school }: SchoolCardProps) {
  const { name, logo, description, cities, phone, licenseCategories, averageRating, reviewCount, _count } = school

  // Показываем первые 4 категории
  const displayCategories = licenseCategories.slice(0, 4)
  const hasMoreCategories = licenseCategories.length > 4

  return (
    <Card.Root overflow="hidden" transition="all 0.2s" _hover={{ transform: 'translateY(-4px)', shadow: 'lg' }}>
      <Card.Body gap={4}>
        {/* Шапка с логотипом и рейтингом */}
        <HStack justify="space-between" align="flex-start">
          <HStack gap={3}>
            <Avatar.Root size="lg">
              <Avatar.Image src={logo ?? undefined} alt={name} />
              <Avatar.Fallback>{name.charAt(0)}</Avatar.Fallback>
            </Avatar.Root>
            <Stack gap={0}>
              <Text fontWeight="semibold" fontSize="lg">
                {name}
              </Text>
              {_count.members > 0 && (
                <HStack fontSize="sm" color="fg.muted">
                  <LuUsers size={14} />
                  <Text>
                    {_count.members} {getInstructorWord(_count.members)}
                  </Text>
                </HStack>
              )}
            </Stack>
          </HStack>
          <RatingDisplay rating={averageRating} reviewCount={reviewCount} size="sm" />
        </HStack>

        {/* Описание */}
        {description && (
          <Text fontSize="sm" color="fg.muted" lineClamp={2}>
            {description}
          </Text>
        )}

        {/* Локация */}
        {cities.length > 0 && (
          <HStack color="fg.muted" fontSize="sm">
            <LuMapPin size={16} />
            <Text lineClamp={1}>{cities.join(', ')}</Text>
          </HStack>
        )}

        {/* Телефон */}
        {phone && (
          <HStack color="fg.muted" fontSize="sm">
            <LuPhone size={16} />
            <Text>{formatPhone(phone)}</Text>
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
            {hasMoreCategories && <Badge variant="outline">+{licenseCategories.length - 4}</Badge>}
          </HStack>
        )}
      </Card.Body>

      <Card.Footer pt={0}>
        <Button asChild colorPalette="brand" variant="outline" flex={1}>
          <Link href={`/schools/${school.id}`}>Подробнее</Link>
        </Button>
      </Card.Footer>
    </Card.Root>
  )
})

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
