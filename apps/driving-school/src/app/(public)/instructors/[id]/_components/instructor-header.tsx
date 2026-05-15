/**
 * Шапка профиля инструктора
 *
 * @module instructor-header
 */

import { formatExperience } from '@/lib/date-utils'
import { Avatar, Card, Heading, HStack, Stack, Text } from '@chakra-ui/react'
import { RatingDisplay } from '@letar/ui'
import { LuMapPin, LuUser } from 'react-icons/lu'

interface InstructorHeaderProps {
  name: string | null
  image: string | null
  averageRating: number | null
  reviewCount: number
  experienceStartDate: Date | null
  workingAreasText: string | null
}

/**
 * Карточка с основной информацией об инструкторе
 */
export function InstructorHeader({
  name,
  image,
  averageRating,
  reviewCount,
  experienceStartDate,
  workingAreasText,
}: InstructorHeaderProps) {
  return (
    <Card.Root>
      <Card.Body>
        <HStack gap={6} flexWrap="wrap">
          <Avatar.Root size="2xl">
            <Avatar.Image src={image ?? undefined} alt={name || 'Instructor'} />
            <Avatar.Fallback>{name?.charAt(0) || '?'}</Avatar.Fallback>
          </Avatar.Root>

          <Stack gap={2} flex={1}>
            <Heading size="xl">{name || 'Без имени'}</Heading>

            <RatingDisplay rating={averageRating} reviewCount={reviewCount} size="lg" />

            {experienceStartDate && (
              <HStack color="fg.muted">
                <LuUser size={18} />
                <Text>Опыт: {formatExperience(experienceStartDate)}</Text>
              </HStack>
            )}

            {workingAreasText && (
              <HStack color="fg.muted">
                <LuMapPin size={18} />
                <Text>{workingAreasText}</Text>
              </HStack>
            )}
          </Stack>
        </HStack>
      </Card.Body>
    </Card.Root>
  )
}
