/**
 * Секция типов занятий инструктора
 *
 * @module instructor-lesson-types
 */

import { Badge, Box, Card, Heading, HStack, Stack, Text } from '@chakra-ui/react'
import { LuClock } from 'react-icons/lu'

import type { InstructorWithRelations } from './instructor-profile.types'

interface InstructorLessonTypesProps {
  lessonTypes: InstructorWithRelations['lessonTypes']
}

/**
 * Список типов занятий и цен
 */
export function InstructorLessonTypes({ lessonTypes }: InstructorLessonTypesProps) {
  if (lessonTypes.length === 0) {
    return null
  }

  return (
    <Card.Root position="sticky" top={4}>
      <Card.Header>
        <Heading size="md">Занятия и цены</Heading>
      </Card.Header>
      <Card.Body pt={0}>
        <Stack gap={4}>
          {lessonTypes.map((lt) => {
            const minPrice =
              lt.pricingOptions.length > 0
                ? Math.min(...lt.pricingOptions.map((po) => Number(po.pricePerLesson)))
                : null
            return (
              <Box key={lt.id} p={4} borderWidth={1} borderRadius="md" _hover={{ bg: 'bg.subtle' }}>
                <HStack justify="space-between" mb={2}>
                  <Text fontWeight="semibold">{lt.name}</Text>
                  <Text fontWeight="bold" color="fg">
                    {minPrice !== null ? `от ${minPrice.toLocaleString('ru-RU')} ₽` : 'Цена не указана'}
                  </Text>
                </HStack>

                {lt.description && (
                  <Text fontSize="sm" color="fg.muted" mb={2}>
                    {lt.description}
                  </Text>
                )}

                <HStack fontSize="sm" color="fg.muted">
                  <LuClock size={14} />
                  <Text>{lt.durationMinutes} мин</Text>
                  {lt.lessonCategory && (
                    <>
                      <Text>•</Text>
                      <Badge size="sm">{lt.lessonCategory}</Badge>
                    </>
                  )}
                </HStack>
              </Box>
            )
          })}
        </Stack>
      </Card.Body>
    </Card.Root>
  )
}
